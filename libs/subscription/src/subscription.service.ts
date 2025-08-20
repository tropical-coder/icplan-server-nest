import { PackagePriceRepository } from '../../repository/package/PackagePriceRepository';
import { Stripe } from "stripe";
import { SubscriptionRepository } from "../../repository/subscription/SubscriptionRepository";
import { CompanyRepository } from "../../repository/company/CompanyRepository";

import { SubscriptionModel, SubscriptionStatus } from "../../model/subscription/SubscriptionModel";
import { BadRequestException } from "routing-controllers";
import { StripeService } from "../stripe/StripeService";
import { CompanyModel } from "../../model/company/CompanyModel";
import { PackageModel, PackageType } from "../../model/package/PackageModel";
import * as moment from "moment";
import { UpdateSubscriptionByAdminRequest } from "../../../admin/controller/subscription/SubscriptionRequest";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import { Request } from "express";
import { RedisRepository } from "../../repository/RedisRepository";
import { PackagePriceModel } from "../../model/package/PackagePriceModel";
import { AdjustSeatsRequest, CreateCheckoutSessionRequest, PreviewSubscriptionChangeRequest, ApplyPromoCodeRequest } from "../../../api/controller/subscription/SubscriptionRequest";
import { UserRepository } from "../../repository/user/UserRepository";
import { RenewSubscriptionRequest } from "../../../api/controller/subscription/SubscriptionRequest";
import { UpdateLimitsBySeats } from '../../helpers/UtilHelper';
import { PackageService } from "../package/PackageService";
import { ActiveCampaignService } from '../active_campaign/ActiveCampaignService';
import { appEnv } from '../../helpers/EnvHelper';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private companyRepository: CompanyRepository,
    private stripeService: StripeService,
    private redisService: RedisService,
    private packageService: PackageService,
    private packagePriceRepository: PackagePriceRepository,
    private userRepository: UserRepository,
    private activeCampaignService: ActiveCampaignService,
  ) {
    this.stripe = this.stripeService.stripe;
  }

  private async getSubscriptionFromCache(
    companyId: number
  ): Promise<SubscriptionModel> {
    const subscription = await this.redisService.Get(`COMPANY-${companyId}`);
    return JSON.parse(subscription);
  }

  private async updateSubscriptionCache(
    companyId: number,
    subscription?: SubscriptionModel
  ) {
    if (!subscription) {
      subscription = await this.subscriptionRepository.FindOne({
        company_id: companyId,
      });
    }

    delete subscription.package;
    await this.redisService.Set(
      `COMPANY-${companyId}`,
      JSON.stringify(subscription)
    );

    return subscription;
  }

  public async GetSubscriptionByCompanyId(companyId: number) {
    let subscriptionModel = await this.subscriptionRepository.FindOne(
      { company_id: companyId },
      { relations: ["package"] }
    );

    return subscriptionModel;
  }

  public async UpdateSubscriptionByAdmin(
    data: UpdateSubscriptionByAdminRequest,
    companyId: number
  ) {
    const company = await this.companyRepository.FindOne(
      { Id: companyId },
      { relations: ["subscription", "subscription.package", "subscription.package_price"] }
    );
    if (!company) {
      throw new BadRequestException("Company not found");
    }

    const { subscription } = company;

    if (
      subscription.package.package_type == PackageType.Normal &&
      data.features.normal_user_limit != subscription.features.normal_user_limit
    ) {
      if (subscription.status != SubscriptionStatus.Active) {
        throw new BadRequestException(
          "Seats can only be updated for active subscriptions"
        );
      }
      const package_price = subscription.package_price;
      if (package_price.value * data.features.normal_user_limit > 999999.99) {
        const allowedSeats = Math.floor(999999.99 / package_price.value);
        throw new BadRequestException(
          `Total amount cannot exceed 999999.99 ${package_price.currency.toUpperCase()}. ` +
          `You can buy maximum ${allowedSeats} seats of this plan.`
        );
      }
      await this.stripeService.AdjustSubscriptionQuantity(
        subscription.stripe_subscription_id,
        data.features.normal_user_limit
      );
    }

    subscription.features = data.features;

    if (data.valid_till) {
      if (company.subscription.status != SubscriptionStatus.Trial) {
        throw new BadRequestException(
          "Valid till can only be updated for trial subscriptions"
        );
      }

      subscription.valid_till = data.valid_till;
      await this.stripeService.UpdateTrialEnd(
        subscription.stripe_subscription_id,
        data.valid_till,
        subscription.status
      );
    }

    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(companyId, subscription),
    ]);

    return subscription;
  }

  public async CreateTrialSubscription(
    ownerEmail: string,
    company: CompanyModel,
    packageModel: PackageModel,
    packagePrice?: PackagePriceModel,
    seats?: number,
    stripePromoCodeId?: string
  ): Promise<SubscriptionModel> {
    let subscription: Stripe.Subscription;
    if (packagePrice) {
      subscription = await this.stripeService.CreateTrialSubscription(
        packagePrice,
        ownerEmail,
        company,
        seats,
        stripePromoCodeId
      );
    }

    delete packageModel.package_detail["package_id"];

    seats ??= 1;

    const subscriptionModel = new SubscriptionModel();
    subscriptionModel.company_id = company.Id;
    subscriptionModel.package_id = packageModel.Id;
    subscriptionModel.price_id = packagePrice?.Id;
    subscriptionModel.features = packageModel.package_detail as any;
    subscriptionModel.status =
      subscription?.status ?? SubscriptionStatus.Active;
    subscriptionModel.stripe_subscription_id = subscription?.id;
    subscriptionModel.stripe_customer_id = subscription?.customer as string;
    subscriptionModel.features.normal_user_limit = seats;
    subscriptionModel.features = UpdateLimitsBySeats(
      subscriptionModel.features,
      packageModel.package_detail,
      seats - 1
    );

    if (packagePrice) {
      subscriptionModel.valid_till = moment()
        .add(packageModel.expiry_in_seconds, "seconds")
        .toDate();
      subscriptionModel.is_trial_extended = false;
    }

    await this.subscriptionRepository.Create(subscriptionModel);

    return subscriptionModel;
  }

  public async ExtendFreeTrial(user: IRedisUserModel) {
    const subscriptionPromise = this.subscriptionRepository.FindOne(
      { company_id: user.company_id },
      { relations: ["package"] }
    );

    const ownerPromise = this.userRepository.FindOne({
      company_id: user.company_id,
      role: UserRoles.Owner,
    });

    const [subscription, owner] = await Promise.all([
      subscriptionPromise,
      ownerPromise,
    ]);

    if (
      ![SubscriptionStatus.Trial, SubscriptionStatus.Paused].includes(
        subscription.status as SubscriptionStatus
      )
    ) {
      throw new BadRequestException(
        "Only free trial subscriptions can be extended"
      );
    }

    if (subscription.is_trial_extended) {
      throw new BadRequestException("Free trial already extended");
    }

    if (moment(subscription.valid_till).isAfter(moment())) {
      throw new BadRequestException("Free trial is still active");
    }

    subscription.valid_till = moment()
      .add(subscription.package.trial_extension_seconds, "seconds")
      .toDate();

    await this.stripeService.UpdateTrialEnd(
      subscription.stripe_subscription_id,
      subscription.valid_till,
      subscription.status,
    );

    subscription.is_trial_extended = true;
    subscription.status = SubscriptionStatus.Trial;
    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(user.company_id, subscription),
      owner.ac_contact_id ? this.activeCampaignService.RemoveContactFromList(
        owner.ac_contact_id,
        appEnv("AC_LIST_FREE_TRIAL")
      ) : null,
      owner.ac_contact_id ? this.activeCampaignService.AddContactToList(
        owner.ac_contact_id,
        appEnv("AC_LIST_EXTENDED_TRIAL")
      ) : null,
    ]);

    return subscription;
  }

  public async CheckSubscriptionValidity(
    path: string,
    companyId: number
  ): Promise<boolean> {
    const allowedRoutes = [
      "/company.*",
      "/me",
      "/subscription.*",
    ];

    for (let route of allowedRoutes) {
      if (new RegExp(route).test(path)) {
        return true;
      }
    }

    // get subscription detail from cache
    let subscription = await this.getSubscriptionFromCache(companyId);
    if (!subscription) {
      subscription = await this.updateSubscriptionCache(companyId);
    }

    if (
      (subscription.status == SubscriptionStatus.Trial &&
        moment().isAfter(moment(subscription.valid_till))) ||
      subscription.status == SubscriptionStatus.Canceled ||
      subscription.status == SubscriptionStatus.Unpaid ||
      subscription.status == SubscriptionStatus.Incomplete ||
      subscription.status == SubscriptionStatus.IncompleteExpired
    ) {
      return false;
    }

    return true;
  }

  public async GetCustomerPortalUrl(
    user: IRedisUserModel,
    req: Request
  ): Promise<string> {
    const subscription = await this.getSubscriptionFromCache(user.company_id);

    const session = await this.stripeService.GetCustomerBillingPortal(
      subscription.stripe_customer_id,
      req.get("host"),
    );

    return session.url;
  }

  public async Unsubscribe(user: IRedisUserModel) {
    const subscription = await this.subscriptionRepository.FindOne({
      company_id: user.company_id,
    });

    if (subscription.status == SubscriptionStatus.Canceled) {
      throw new BadRequestException("Subscription already cancelled");
    }

    if (subscription.cancel_at) {
      throw new BadRequestException(
        "Subscription already scheduled for cancellation"
      );
    }

    let sub: Stripe.Subscription;
    if (subscription.status == SubscriptionStatus.Active) {
      // subscription will cancel at the end of the current billing cycle
      sub = await this.stripeService.ScheduleCancellation(
        subscription.stripe_subscription_id,
      );
      subscription.cancel_at = moment.unix(sub.cancel_at).toDate();
    } else {
      sub = await this.stripeService.CancelImmediately(
        subscription.stripe_subscription_id
      );
    }

    subscription.status = sub.status;
    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(user.company_id, subscription),
    ]);

    return subscription;
  }

  public async Resubscribe(user: IRedisUserModel) {
    const subscription = await this.subscriptionRepository.FindOne({
      company_id: user.company_id,
    });

    if (subscription.status == SubscriptionStatus.Canceled) {
      throw new BadRequestException("Subscription is already cancelled");
    }

    if (!subscription.cancel_at) {
      throw new BadRequestException(
        "Subscription is not scheduled for cancellation"
      );
    }

    await this.stripeService.UnscheduleCancellation(
      subscription.stripe_subscription_id
    );
    subscription.cancel_at = null;
    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(user.company_id, subscription),
    ]);

    return subscription;
  }

  public async Renew(
    data: RenewSubscriptionRequest,
    user: IRedisUserModel
  ): Promise<{
    subscription: SubscriptionModel;
    latest_invoice: Stripe.Invoice;
  }> {
    const subscriptionPromise = this.subscriptionRepository.FindOne({
      company_id: user.company_id,
    });

    const packagePricePromise = this.packagePriceRepository.FindOne(
      { Id: data.price_id, active: true, package: { active: true } },
      { relations: ["package", "package.package_detail"] }
    );

    const userPromise = this.userRepository.FindOne(
      { Id: user.Id },
      { relations: ["company"] }
    );

    const [subscription, packagePrice, userModel] = await Promise.all([
      subscriptionPromise,
      packagePricePromise,
      userPromise,
    ]);

    if (
      ![
        SubscriptionStatus.Canceled,
        SubscriptionStatus.IncompleteExpired,
      ].includes(subscription.status as SubscriptionStatus)
    ) {
      throw new BadRequestException("Only canceled subscriptions can be restarted");
    }

    if (!packagePrice) {
      throw new BadRequestException("The requested tiered plan is unavailable.");
    }

    const seats = subscription.features.normal_user_limit;
    // Create a new subscription in Stripe
    const newStripeSubscription = await this.stripeService.CreateSubscription(
      userModel.email,
      userModel.company,
      packagePrice,
      seats
    );

    // Update the subscription model with new Stripe subscription details
    subscription.status = newStripeSubscription.status;
    subscription.cancel_at = null;
    subscription.package_id = packagePrice.package.Id;
    subscription.price_id = packagePrice.Id;
    subscription.features = packagePrice.package.package_detail as any;
    subscription.stripe_subscription_id = newStripeSubscription.id;
    subscription.stripe_customer_id = newStripeSubscription.customer as string;
    subscription.features.normal_user_limit = seats;
    subscription.features = UpdateLimitsBySeats(
      subscription.features,
      packagePrice.package.package_detail,
      seats - 1
    );

    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(user.company_id, subscription),
    ]);

    return {
      subscription,
      latest_invoice: newStripeSubscription.latest_invoice as Stripe.Invoice,
    };
  }

  public async AdjustSeats(data: AdjustSeatsRequest, user: IRedisUserModel) {
    const subscriptionPromise = this.subscriptionRepository.FindOne(
      { company_id: user.company_id },
      { relations: ["package_price", "package", "package.package_detail"] }
    );

    const userCountPromise = this.userRepository.Count({
      company_id: user.company_id,
      is_deleted: 0,
    });

    const [subscription, userCount] = await Promise.all([
      subscriptionPromise,
      userCountPromise,
    ]);

    if (data.seats < userCount) {
      throw new BadRequestException(
        "You have to delete users before reducing seats"
      );
    }

    if (subscription.status != SubscriptionStatus.Active) {
      throw new BadRequestException(
        "Seats can only be updated for active subscriptions"
      );
    }

    const { package_price } = subscription;
    if (package_price.value * data.seats > 999999.99) {
      const allowedSeats = Math.floor(999999.99 / package_price.value);
      throw new BadRequestException(
        `Total amount cannot exceed 999999.99 ${package_price.currency.toUpperCase()}. ` +
        `You can buy maximum ${allowedSeats} seats of this plan.`
      );
    }

    await this.stripeService.AdjustSubscriptionQuantity(
      subscription.stripe_subscription_id,
      data.seats
    );
    const seatDifference = data.seats - subscription.features.normal_user_limit;
    subscription.features.normal_user_limit = data.seats;
    subscription.features = UpdateLimitsBySeats(
      subscription.features,
      subscription.package.package_detail,
      seatDifference
    );

    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(user.company_id, subscription),
    ]);

    return subscription;
  }

  public async GetCheckoutSessionURL(
    data: CreateCheckoutSessionRequest,
    user: IRedisUserModel,
    req: Request
  ) {
    const subscriptionPromise = this.subscriptionRepository.FindOne(
      { company_id: user.company_id },
      { relations: ["company"] }
    );

    const packagePricePromise = this.packagePriceRepository.FindOne(
      { Id: data.price_id, active: true, package: { active: true } },
      { relations: ["package"] }
    );

    const userCountPromise = this.userRepository.Count({
      company_id: user.company_id,
      is_deleted: 0,
    });

    const [subscription, packagePrice, userCount] = await Promise.all([
      subscriptionPromise,
      packagePricePromise,
      userCountPromise,
    ]);

    if (!packagePrice) {
      throw new BadRequestException("The requested tiered plan is unavailable.");
    }

    const automaticTax = subscription.company.country_code == "GB";
    const checkoutSession = await this.stripeService.CreateCheckoutSession(
      subscription.stripe_subscription_id,
      packagePrice,
      userCount,
      req.get("host"),
      automaticTax,
    );

    return checkoutSession.url;
  }

  // can be used to preview amount need to be paid for price or seat change
  public async PreviewSubscriptionChange(
    data: PreviewSubscriptionChangeRequest,
    user: IRedisUserModel,
  ) {
    const subscription = await this.subscriptionRepository.FindOne(
      { company_id: user.company_id },
      { relations: ["company"] },
    );

    if (subscription.status != SubscriptionStatus.Active) {
      throw new BadRequestException("Subscription must be active to preview changes");
    }

    let packagePrice: PackagePriceModel;
    if (data.price_id) {
      packagePrice = await this.packagePriceRepository.FindOne(
        { Id: data.price_id, active: true, package: { active: true } },
        { relations: ["package"] }
      );

      if (!packagePrice) {
        throw new BadRequestException("The requested tiered plan is unavailable.");
      }
    }

    const automaticTax = subscription.company.country_code == "GB";
    return await this.stripeService.PreviewSubscriptionChange(
      subscription.stripe_subscription_id,
      data.seats ?? subscription.features.normal_user_limit,
      data.price_id ? packagePrice.stripe_price_id : null,
      automaticTax,
    );
  }

  public async ChangeSubscriptionPrice(priceId: number, companyId: number) {
    const subscription = await this.subscriptionRepository.FindOne(
      { company_id: companyId },
      { relations: ["company"] }
    );

    if (!subscription.price_id) {
      throw new BadRequestException("Cannot change price for enterprise plan");
    }

    if (subscription.price_id == priceId) {
      throw new BadRequestException("Already on this plan");
    }

    // 0 for enterprise
    if (priceId != 0 && subscription.status != SubscriptionStatus.Active) {
      throw new BadRequestException("Price can only be updated for active subscriptions");
    }

    let packagePrice: PackagePriceModel;
    let packageModel: PackageModel;
    if (priceId != 0) {
      packagePrice = await this.packagePriceRepository.FindOne(
        { Id: priceId, active: true, package: { active: true } },
        { relations: ["package", "package.package_detail"] }
      );

      if (!packagePrice) {
        throw new BadRequestException("The requested tiered plan is unavailable.");
      }

      packageModel = packagePrice.package;

      const stripeSub = await this.stripeService.ChangeSubscriptionPrice(
        subscription,
        packagePrice.stripe_price_id,
      );

      subscription.status = stripeSub.status;

    } else {
      packageModel = await this.packageService.GetEnterprisePackage();

      if (subscription.status != SubscriptionStatus.Canceled) {
        await this.stripeService.CancelImmediately(subscription.stripe_subscription_id);
      }

      subscription.stripe_subscription_id = null;
      subscription.stripe_customer_id = null;
      subscription.valid_till = null;
      subscription.cancel_at = null;
      subscription.status = SubscriptionStatus.Active;
    }
    subscription.package_id = packageModel.Id;
    subscription.price_id = packagePrice?.Id;
    const normalUserLimit = subscription.features.normal_user_limit;
    subscription.features = packageModel.package_detail as any;
    subscription.features.normal_user_limit = normalUserLimit;

    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(companyId, subscription),
    ]);

    subscription.package = packageModel;
    subscription.package_price = packagePrice;

    return subscription;
  }

  public async ApplyPromoCode(
    promo_code: string,
    user: IRedisUserModel
  ) {
    const subscriptionPromise = await this.subscriptionRepository.FindOne(
      {
        company_id: user.company_id,
      },
      { relations: ["package"] }
    );

    const ownerPromise = this.userRepository.FindOne({
      company_id: user.company_id,
      role: UserRoles.Owner,
    });

    const [subscription, owner] = await Promise.all([
      subscriptionPromise,
      ownerPromise,
    ]);

    if (subscription.status !== SubscriptionStatus.Trial) {
      throw new BadRequestException(
        "Promo code can only be applied to free trial subscriptions"
      );
    }

    let promoCodeId: string;
    if (promo_code) {
      const promoCode = await this.packageService.ValidatePromotionCode(
        promo_code,
        subscription.package.stripe_product_id,
        subscription.stripe_customer_id,
      );

      if (promoCode.retrictions.first_time_transaction) {
        throw new BadRequestException(
          "The promo code is only valid for first time transactions"
        );
      }
      promoCodeId = promoCode.id;
    }

    await this.stripeService.ApplyPromoCodeToSubscription(
      subscription.stripe_subscription_id,
      promoCodeId
    );

    const promoCodeTagPromise = !subscription.promo_code && promo_code && owner.ac_contact_id
      ? this.activeCampaignService.AddTagToContact(
          owner.ac_contact_id,
          appEnv("AC_TAG_PROMO_CODE_ADDED")
        )
      : null;

    subscription.promo_code = promo_code ? promo_code.toUpperCase() : null;

    await Promise.all([
      this.subscriptionRepository.Save(subscription),
      this.updateSubscriptionCache(user.company_id, subscription),
      promoCodeTagPromise,
    ]);

    return subscription;
  }

  /**
   * Disables collecting invoice payments and mark all future invoices as free
   */
  public async PauseCollection(companyId: number) {
    const subscription = await this.subscriptionRepository.FindOne(
      { company_id: companyId },
    );

    if (subscription.price_id && subscription.status == SubscriptionStatus.Active) {
      return await this.stripeService.PauseCollection(
        subscription.stripe_subscription_id
      );
    }

    return false;
  }

  public async ResumeCollection(companyId: number) {
    const subscription = await this.subscriptionRepository.FindOne(
      { company_id: companyId },
    );

    if (subscription.price_id && subscription.status == SubscriptionStatus.Active) {
      return await this.stripeService.ResumeCollection(
        subscription.stripe_subscription_id
      );
    }

    return false;
  }

  /**
   * Cancel the subscription immediately
   */
  public async CancelImmediately(companyId: number) {
    const subscription = await this.subscriptionRepository.FindOne(
      { company_id: companyId },
    );

    if (subscription.price_id && subscription.status != SubscriptionStatus.Canceled) {
      return await this.stripeService.CancelImmediately(
        subscription.stripe_subscription_id
      );
    }

    return null;
  }

}
