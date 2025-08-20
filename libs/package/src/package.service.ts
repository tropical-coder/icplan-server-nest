
import { PackageRepository } from "../../repository/package/PackageRepository";
import { PackageModel, PackageType } from "../../model/package/PackageModel";
import { BadRequestException, InternalServerError } from "routing-controllers";
import { PackageDetailModel } from "../../model/package/PackageDetailModel";
import { PaginationParam } from "../../controller/base/BaseRequest";
import {
  CreatePackagePriceRequest,
  CreatePackageRequest,
  UpdatePackagePriceRequest,
} from "../../../admin/controller/package/PackageRequest";
import { IRedisAdminModel } from "../../model/admin/AdminModel";
import {
  PackagePriceModel,
  TaxBehavior,
} from "../../model/package/PackagePriceModel";
import { PackagePriceRepository } from "../../repository/package/PackagePriceRepository";
import { StripeService } from "../stripe/StripeService";
import Stripe from "stripe";
import { PackageDetailRepository } from "../../repository/package/PackageDetailRepository";
import { DeleteAWSFile, GetAWSSignedUrl, GetFileKey } from "../aws/MediaService";
import { IRedisUserModel } from "../../model/user/UserModel";
import { SubscriptionRepository } from "../../repository/subscription/SubscriptionRepository";

@Injectable()
export class PackageService {
  private stripe: Stripe;
  constructor(
    private packageRepository: PackageRepository,
    private packageDetailRepository: PackageDetailRepository,
    private packagePriceRepository: PackagePriceRepository,
    private stripeService: StripeService,
    private subscriptionRepository: SubscriptionRepository,
  ) {
    this.stripe = this.stripeService.stripe;
  }

  public async GetPackages(params: PaginationParam, isAdmin = false, user?: IRedisUserModel) {
    const packagesPromise = this.packageRepository.GetPackages(params, isAdmin);

    let userSubscriptionPromise, stripeSubscription: Stripe.Subscription;
    if (user) {
      userSubscriptionPromise = this.subscriptionRepository.FindOne(
        { company_id: user.company_id },
        { relations: ["package_price"] },
      );
    }

    const [packages, userSubscription] = await Promise.all([
      packagesPromise,
      userSubscriptionPromise,
    ]);

    if (userSubscription) {
      stripeSubscription = await this.stripe.subscriptions.retrieve(
        userSubscription.stripe_subscription_id,
        {
          expand: ["latest_invoice"],
        }
      );
    }

    return { 
      ...packages,
      subscribedPrice: userSubscription?.package_price || null,
      stripeSubscription
    };
  }

  public async GetPackageById(packageId: number, isAdmin = false) {
    return await this.packageRepository.GetPackageById(packageId, isAdmin);
  }

  public async CreatePackage(
    data: CreatePackageRequest,
    admin: IRedisAdminModel
  ) {
    const stripeProduct = await this.stripeService.CreateStripeProduct(data);

    if (data.is_default) {
      await this.packageRepository.Update(
        { is_default: true },
        { is_default: false },
      );
    }

    const packageModel = new PackageModel();
    packageModel.assignAttributes(data, admin.Id, stripeProduct.id);
    await this.packageRepository.Create(packageModel);

    const packageDetailModel = new PackageDetailModel();
    packageDetailModel.assignAttributes(data, packageModel.Id);
    await this.packageDetailRepository.Create(packageDetailModel);

    packageModel.package_detail = packageDetailModel;

    return packageModel;
  }

  public async UpdatePackage(data: CreatePackageRequest, packageId: number) {
    const packageModel = await this.packageRepository.FindById(packageId, {
      relations: ["package_detail"],
    });

    if (!packageModel) {
      throw new BadRequestException("Package not found");
    }

    if (data.is_default) {
      if (packageModel.package_type == PackageType.Enterprise) {
        throw new BadRequestException("Cannot set enterprise package as default");
      }
      if (!packageModel.is_default) {
        await this.packageRepository.Update(
          { is_default: true },
          { is_default: false },
        );
      }
    }

    if (packageModel.package_type != PackageType.Enterprise) {
      await this.stripeService.UpdateStripeProduct(
        data,
        packageModel.stripe_product_id
      );
    }

    packageModel.assignAttributes(data);

    const { package_detail: packageDetailModel } = packageModel;
    packageDetailModel.assignAttributes(data);

    const imageUrl = packageModel.icon;
    delete packageModel.icon;

    await Promise.all([
      this.packageRepository.Save(packageModel),
      this.packageDetailRepository.Save(packageDetailModel),
    ]);

    packageModel.icon = imageUrl;

    return packageModel;
  }

  public async GetPackagePriceById(priceId: number) {
    // if priceId == 0, get default package's price
    const packagePrice = await this.packagePriceRepository.FindOne(
      priceId == 0
        ? {
            package: { active: true, is_default: true },
            recurring: { interval: "month" },
            active: true,
          }
        : { Id: priceId, active: true, package: { active: true } },
      { relations: ["package"] }
    );

    if (!packagePrice) {
      throw new BadRequestException("The selected plan is not available");
    }

    return packagePrice;
  }

  public async AddPackagePrice(
    data: CreatePackagePriceRequest,
    packageId: number,
    admin: IRedisAdminModel
  ) {
    const [packageModel, duplicatePrice] = await Promise.all([
      this.packageRepository.FindById(packageId),
      this.packagePriceRepository.FindOne({
        package_id: packageId,
        recurring: { interval: data.interval },
        active: true,
      })
    ]);

    if (!packageModel) {
      throw new BadRequestException("Package not found");
    }

    if (packageModel.package_type != PackageType.Normal) {
      throw new BadRequestException("Cannot add price to this package");
    }

    if (duplicatePrice) {
      throw new BadRequestException("Price for given interval already exists");
    }

    const stripePrice = await this.stripeService.CreateStripePrice(
      data,
      packageModel.stripe_product_id
    );

    const packagePriceModel = new PackagePriceModel();
    packagePriceModel.active = data.active;
    packagePriceModel.currency = "gbp";
    packagePriceModel.recurring = {
      interval: data.interval,
    } as Stripe.Price.Recurring;
    packagePriceModel.tax_behavior = TaxBehavior.UNSPECIFIED;
    packagePriceModel.value = +data.value;
    packagePriceModel.created_by = admin.Id;
    packagePriceModel.stripe_price_id = stripePrice.id;
    packagePriceModel.product = packageModel.stripe_product_id;
    packagePriceModel.package_id = packageModel.Id;

    await this.packagePriceRepository.Create(packagePriceModel);

    return packagePriceModel;
  }

  public async UpdatePackagePrice(
    data: UpdatePackagePriceRequest,
    priceId: number
  ) {
    const packagePriceModel = await this.packagePriceRepository.FindById(
      priceId,
      {
        relations: ["package"],
      }
    );

    if (!packagePriceModel) {
      throw new BadRequestException("Price not found");
    }

    if (data.active) {
      const duplicatePrice = await this.packagePriceRepository.FindOne({
        package_id: packagePriceModel.package_id,
        recurring: { interval: packagePriceModel.recurring.interval },
        active: true,
      });

      if (duplicatePrice) {
        throw new BadRequestException("There can only be one active price per interval");
      }
    }

    await this.stripe.prices.update(
      packagePriceModel.stripe_price_id,
      data
    );
    packagePriceModel.active = data.active;

    await this.packagePriceRepository.Save(packagePriceModel);
    return packagePriceModel;
  }

  public async UploadPackageIcon(packageId: number, icon) {
    const packageModel = await this.packageRepository.FindById(packageId);

    if (!packageModel) {
      throw new BadRequestException("Package not found");
    }

    try {
      if (packageModel.icon) {
        const imageUrl = packageModel.icon.split("?")[0];
        DeleteAWSFile(imageUrl.substr(imageUrl.lastIndexOf("/") + 1));
      }
      await this.packageRepository.Update(
        { Id: packageId },
        { icon: icon.location },
      );
      const signedIcon = await GetAWSSignedUrl(GetFileKey(icon.location));
      return { package: { icon: signedIcon } };
    } catch (error) {
      throw new InternalServerError(error);
    }
  }

  public async ValidatePromotionCode(code: string, stripeProductId?: string, stripeCustomerId?: string) {
    const resp = await this.stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
      expand: ["data.coupon.applies_to"],
    });

    if (!resp.data.length) {
      throw new BadRequestException("Invalid promotion code");
    }

    const promotionCode = resp.data[0];
    if (!promotionCode.coupon.valid) {
      throw new BadRequestException("Invalid promotion code");
    }

    // check product specific promo code
    if (stripeProductId && promotionCode.coupon.applies_to?.products.length) {
      if (!promotionCode.coupon.applies_to.products.includes(stripeProductId)) {
        throw new BadRequestException("The promo code is not applicable to this tiered plan.");
      }
    }

    // check customer specific promo code
    if (
      stripeCustomerId &&
      promotionCode.customer &&
      promotionCode.customer != stripeCustomerId
    ) {
      throw new BadRequestException(
        "Invalid promotion code"
      );
    }

    return {
      id: promotionCode.id,
      code: promotionCode.code,
      amount_off: promotionCode.coupon.amount_off,
      percent_off: promotionCode.coupon.percent_off,
      retrictions: promotionCode.restrictions,
    };
  }

  public async GetEnterprisePackage(): Promise<PackageModel> {
    return await this.packageRepository.FindOne(
      { package_type: PackageType.Enterprise, active: true },
      { relations: ["package_detail"] }
    );
  }
}
