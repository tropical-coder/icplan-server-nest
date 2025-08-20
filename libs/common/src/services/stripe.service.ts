import Stripe from "stripe";
import * as moment from "moment";
import { RedisService } from "./redis.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SubscriptionRepository } from "@app/subscription/subscription.repository";

@Injectable()
export class StripeService {
  public stripe: Stripe;

  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private redisService: RedisService,
    private packagePriceRepository: PackagePriceRepository,
    private notificationService: NotificationService,
    private userRepository: UserRepository,
    private activeCampaignService: ActiveCampaignService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-07-30.basil",
    });
  }

  private async updateSubscriptionCache(companyId: number) {
    const subscription = await this.subscriptionRepository.FindOne({
      company_id: companyId,
    });

    if (!subscription) throw new Error("Subscription not found");

    delete subscription['package'];
    await this.redisService.Set(
      `COMPANY-${companyId}`,
      JSON.stringify(subscription)
    );

    return subscription;
  }

  private eventHandlers: Partial<{
    [key in Stripe.Event.Type]: (data: Stripe.Event.Data) => Promise<any>;
  }> = {
    "customer.subscription.updated": this.handleSubscriptionUpdated.bind(this),
    "customer.subscription.paused": this.handleSubscriptionUpdated.bind(this),
    "customer.subscription.deleted": this.handleSubscriptionUpdated.bind(this),
    "customer.subscription.resumed": this.handleSubscriptionUpdated.bind(this),
    "checkout.session.completed": this.handleCheckoutCompleted.bind(this),
    "invoice.payment_failed": this.handleInvoicePaymentFailed.bind(this),
  };

  public async HandleStripeEvent(req: Request) {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = appEnv("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        sig,
        endpointSecret
      );
    } catch (err) {
      console.error(err.message);
      throw new InternalServerError("Stripe webhook error: " + err.message);
    }

    if (!this.eventHandlers[event.type]) {
      console.log(`No event handler for ${event.type}`);
      return;
    }
    console.log(`Stripe Event: ${event.type}`);
    return await this.eventHandlers[event.type](event.data.object);
  }

  private async handleSubscriptionUpdated(data: Stripe.Subscription) {
    await this.subscriptionRepository.Update(
      { stripe_subscription_id: data.id },
      { status: data.status }
    );

    await this.updateSubscriptionCache(+data.metadata.company_id);

    if (data.status == SubscriptionStatus.Active) {
      const owner = await this.userRepository.FindOne({
        company_id: +data.metadata.company_id,
        role: UserRoles.Owner,
      });

      if (owner.ac_contact_id) {
        this.activeCampaignService.SubscribeContactToPaidList(
          owner.ac_contact_id
        );
      }
    }
    return true;
  }

  private async handleCheckoutCompleted(data: Stripe.Checkout.Session) {
    const subscriptionPromise = this.stripe.subscriptions.retrieve(
      data.subscription as string
    );
    const priceModelPromise = this.packagePriceRepository.FindOne(
      { Id: data.metadata.package_price_id },
      { relations: ["package", "package.package_detail"] }
    );
    const oldSubPromise = this.subscriptionRepository.FindOne({
      stripe_subscription_id: data.metadata.old_subscription_id,
    });

    const [subscription, priceModel, oldSub] = await Promise.all([
      subscriptionPromise,
      priceModelPromise,
      oldSubPromise,
    ]);

    let features: Features = priceModel.package.package_detail as any;
    features.normal_user_limit = subscription.items.data[0].quantity;
    features = UpdateLimitsBySeats(
      features,
      priceModel.package.package_detail,
      features.normal_user_limit - 1
    );

    const [owner] = await Promise.all([
      this.userRepository.FindOne({
        company_id: oldSub.company_id,
        role: UserRoles.Owner,
      }),
      this.subscriptionRepository.Update(
        { company_id: +subscription.metadata.company_id },
        {
          status: subscription.status,
          stripe_subscription_id: subscription.id,
          price_id: priceModel.Id,
          package_id: priceModel.package_id,
          features: features,
        }
      ),
    ]);

    if (
      oldSub.status == SubscriptionStatus.Paused ||
      oldSub.status == SubscriptionStatus.Active
    ) {
      await this.stripe.subscriptions.cancel(data.metadata.old_subscription_id);
    }

    this.updateSubscriptionCache(+subscription.metadata.company_id);

    if (owner.ac_contact_id) {
      this.activeCampaignService.SubscribeContactToPaidList(owner.ac_contact_id);
    }

    return true;
  }

  private async handleInvoicePaymentFailed(data: Stripe.Invoice) {
    const subscription = await this.subscriptionRepository.FindOne({
      stripe_subscription_id: data.subscription,
    });

    if (!subscription) return false;

    const ownersPromise = this.userRepository.Find({
      company_id: subscription.company_id,
      role: UserRoles.Owner,
      is_deleted: 0,
    });

    const paymentIntentPromise = this.stripe.paymentIntents.retrieve(
      data.payment_intent as string,
      { expand: ["latest_charge"] }
    );

    const [owners, paymentIntent] = await Promise.all([
      ownersPromise,
      paymentIntentPromise,
    ]);

    const charge = paymentIntent.latest_charge as Stripe.Charge;
    const last4 = charge?.payment_method_details?.card?.last4;

    const constant = DeepClone(NotificationConstants.SubscriptionPaymentFailed);

    constant.body = constant.body.replace(
      "{{cardInfo}}",
      last4 ? " with card xxxx-xxxx-xxxx-" + last4 : ""
    );
    // Send notification to all admins
    await this.notificationService.SendNotification(constant, owners);

    return true;
  }

  public CreateStripeProduct = WrapFunctionWithTryCatch(
    async (data: CreatePackageRequest) => {
      const stripeProduct = await this.stripe.products.create({
        name: data.name,
        description: data.description,
        active: data.active,
        metadata: {
          package_type: PackageType.Normal,
        },
        marketing_features: data.marketing_features.map((feat) => ({
          name: feat,
        })),
      });

      return stripeProduct;
    }
  );

  public UpdateStripeProduct = WrapFunctionWithTryCatch(
    async (data: CreatePackageRequest, stripeProductId: string) => {
      const stripeProduct = await this.stripe.products.update(stripeProductId, {
        name: data.name,
        description: data.description,
        active: data.active,
        metadata: {
          package_type: PackageType.Normal,
        },
        marketing_features: data.marketing_features.map((feat) => ({
          name: feat,
        })),
      });

      return stripeProduct;
    }
  );

  public CreateStripePrice = WrapFunctionWithTryCatch(
    async (data: CreatePackagePriceRequest, stripeProductId: string) => {
      const stripePrice = await this.stripe.prices.create({
        currency: "gbp",
        product: stripeProductId,
        unit_amount_decimal: (data.value * 100).toString(),
        active: data.active,
        recurring: { interval: data.interval },
      });

      return stripePrice;
    }
  );

  public CreateOrGetStripeCustomer = WrapFunctionWithTryCatch(
    async (
      email: string,
      name: string,
      countryCode: string
    ): Promise<Stripe.Customer> => {
      // First search for existing customer
      const customers = await this.stripe.customers.search({
        query: `email:'${email}'`,
      });

      if (customers.data.length > 0) {
        return customers.data[0];
      }

      // Create new customer if not found
      const customer = await this.stripe.customers.create({
        email,
        name,
        address: {
          country: countryCode,
        },
      });

      return customer;
    }
  );

  public CreateTrialSubscription = WrapFunctionWithTryCatch(
    async (
      priceModel: PackagePriceModel,
      ownerEmail: string,
      company: CompanyModel,
      seats: number = 1,
      stripePromoCodeId?: string
    ): Promise<Stripe.Subscription> => {
      // Get or create customer
      const customer = await this.CreateOrGetStripeCustomer(
        ownerEmail,
        company.name,
        company.country_code
      );

      const trial_end = moment()
        .add(priceModel.package.expiry_in_seconds, "seconds")
        .unix();

      // Create subscription with trial
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        proration_behavior: "create_prorations",
        items: [
          {
            price: priceModel.stripe_price_id,
            quantity: seats,
          },
        ],
        trial_end: trial_end,
        trial_settings: {
          end_behavior: {
            missing_payment_method: "pause",
          },
        },
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        collection_method: "charge_automatically",
        payment_behavior: "allow_incomplete",
        description: priceModel.package.name,
        metadata: {
          company_id: company.Id.toString(),
        },
        discounts: stripePromoCodeId
          ? [
              {
                promotion_code: stripePromoCodeId,
              },
            ]
          : undefined,
        automatic_tax: { enabled: company.country_code == "GB" },
      });

      return subscription;
    }
  );

  public CreateSubscription = WrapFunctionWithTryCatch(
    async (
      ownerEmail: string,
      company: CompanyModel,
      packagePrice: PackagePriceModel,
      quantity: number
    ): Promise<Stripe.Subscription> => {
      // Get or create customer
      const customer = await this.CreateOrGetStripeCustomer(
        ownerEmail,
        company.name,
        company.country_code
      );

      // Create subscription with trial
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        proration_behavior: "create_prorations",
        items: [{ price: packagePrice.stripe_price_id, quantity }],
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        collection_method: "charge_automatically",
        payment_behavior: "default_incomplete",
        description: packagePrice.package.name,
        metadata: {
          company_id: company.Id.toString(),
        },
        expand: ["latest_invoice"],
        automatic_tax: { enabled: company.country_code == "GB" },
      });

      return subscription;
    }
  );

  public UpdateTrialEnd = WrapFunctionWithTryCatch(
    async (
      subscriptionId: string,
      valid_till: Date,
      status: Stripe.Subscription.Status
    ) => {
      if (status == SubscriptionStatus.Paused) {
        await this.stripe.subscriptions.resume(subscriptionId, {
          billing_cycle_anchor: "unchanged",
          proration_behavior: "none",
        });
      }
  
      return await this.stripe.subscriptions.update(subscriptionId, {
        proration_behavior: "none",
        trial_end: moment(valid_till).unix(),
      });
    }
  );

  public GetCustomerBillingPortal = WrapFunctionWithTryCatch(
    async (stripeCustomerId: string, host: string) => {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `https://${host}/#/admin/actions/dashboard`,
      });

      return session;
    }
  );

  public AdjustSubscriptionQuantity = WrapFunctionWithTryCatch(
    async (subscriptionId: string, seats: number) => {
      const stripeSubItems = await this.stripe.subscriptionItems.list({
        subscription: subscriptionId,
        limit: 1,
      });
      const subscription = await this.stripe.subscriptionItems.update(
        stripeSubItems.data[0].id,
        {
          proration_behavior: "always_invoice",
          payment_behavior: "allow_incomplete",
          quantity: seats,
        }
      );

      return subscription;
    }
  );

  public ScheduleCancellation = WrapFunctionWithTryCatch(
    async (subscriptionId: string) => {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          // TODO: Collect feedback at the time of cancellation
          // cancellation_details: {
          //   feedback: "",
          //   comment: "",
          // }
          cancel_at_period_end: true,
        }
      );

      return subscription;
    }
  );

  public CancelImmediately = WrapFunctionWithTryCatch(
    async (subscriptionId: string) => {
      const subscription = await this.stripe.subscriptions.cancel(
        subscriptionId,
        {
          // TODO: Collect feedback at the time of cancellation
          // cancellation_details: {
          //   feedback: "",
          //   comment: "",
          // }
        }
      );

      return subscription;
    }
  );

  public UnscheduleCancellation = WrapFunctionWithTryCatch(
    async (subscriptionId: string) => {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: false,
        }
      );

      return subscription;
    }
  );

  public CreateCheckoutSession = WrapFunctionWithTryCatch(
    async (
      stripeSubscriptionId: string,
      packagePrice: PackagePriceModel,
      minQuantity: number,
      host: string,
      automaticTax: boolean
    ) => {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      let allowPromocode = true;
      if (stripeSubscription.discount) {
        allowPromocode = !stripeSubscription.discount.coupon.valid;
      }

      const session = await this.stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeSubscription.customer as string,
        success_url: `https://${host}/#/admin/actions/dashboard`,
        cancel_url: `https://${host}/#/admin/actions/dashboard`,
        metadata: {
          old_subscription_id: stripeSubscriptionId,
          package_price_id: packagePrice.Id,
        },
        line_items: [
          {
            price: packagePrice.stripe_price_id,
            quantity: stripeSubscription.items.data[0].quantity,
            adjustable_quantity: {
              enabled: true,
              minimum: minQuantity,
              maximum: 999999,
            },
          },
        ],
        automatic_tax: { enabled: automaticTax },
        subscription_data: {
          metadata: stripeSubscription.metadata,
          description: packagePrice.package.name,
        },
        discounts: !allowPromocode
          ? [{ coupon: stripeSubscription.discount.coupon.id }]
          : undefined,
        allow_promotion_codes: allowPromocode || undefined,
      });

      return session;
    }
  );

  public PreviewSubscriptionChange = WrapFunctionWithTryCatch(
    async (
      stripeSubscriptionId: string,
      quantity: number,
      stripPriceId?: string,
      automaticTax = false
    ) => {
      const subscription = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      const prorationDate = moment().unix() + 60 * 10; // 10 minutes buffer
      const invoice = await this.stripe.invoices.retrieveUpcoming({
        subscription: stripeSubscriptionId,
        subscription_items: [
          {
            id: subscription.items.data[0].id,
            price: stripPriceId ?? undefined,
            quantity: quantity,
          },
        ],
        subscription_proration_date: prorationDate,
        subscription_proration_behavior: "always_invoice",
        automatic_tax: { enabled: automaticTax },
      });

      return invoice;
    }
  );

  public ChangeSubscriptionPrice = WrapFunctionWithTryCatch(
    async (subscription: SubscriptionModel, stripePriceId: string) => {
      const automaticTax = subscription.company.country_code == "GB";
      let stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );

      stripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          items: [
            {
              id: stripeSubscription.items.data[0].id,
              price: stripePriceId,
              quantity: subscription.features.normal_user_limit,
            },
          ],
          proration_behavior: "always_invoice",
          payment_behavior: "allow_incomplete",
          automatic_tax: { enabled: automaticTax },
        }
      );

      return stripeSubscription;
    }
  );

  public ApplyPromoCodeToSubscription = WrapFunctionWithTryCatch(
    async (subscriptionId: string, promoCodeId?: string) => {
      // if promoCodeId is null then remove the promo code
      if (promoCodeId) {
         await this.stripe.subscriptions.update(subscriptionId, {
          discounts: [
            {
              promotion_code: promoCodeId,
            },
          ]
        });
      } else {
        await this.stripe.subscriptions.deleteDiscount(subscriptionId);
      }

      return true;
    }
  );

  public PauseCollection = WrapFunctionWithTryCatch(
    async (subscriptionId: string) => {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          pause_collection: {
            behavior: "mark_uncollectible",
          },
        }
      );

      return subscription;
    }
  );

  public ResumeCollection = WrapFunctionWithTryCatch(
    async (subscriptionId: string) => {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          pause_collection: "",
        }
      );

      return subscription;
    }
  );
}
