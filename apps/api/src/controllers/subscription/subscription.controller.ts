import { BadRequestException, Body, CurrentUser, Get, JsonController, Post, Put, QueryParams, Req, Res } from "routing-controllers";

import { SubscriptionService } from "../../../app/service/subscription/SubscriptionService";
import { Authorized } from "../../../app/decorator/Authorized";
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import { AdjustSeatsRequest, ChangeSubscriptionPriceRequest, CreateCheckoutSessionRequest, PreviewSubscriptionChangeRequest } from "./SubscriptionRequest";
import { RenewSubscriptionRequest } from "./SubscriptionRequest";
import { ApplyPromoCodeRequest } from "./SubscriptionRequest";

@ApiTags()
@Controller()
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Authorized(UserRoles.Owner)
  @Post("/subscription/extend-free-trial")
  async ExtendFreeTrial(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.ExtendFreeTrial(user);
    return subscription;
  }
  

  @Authorized(UserRoles.Owner)
  @Get("/subscription/customer/portal")
  async GetCustomerPortalUrl(
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const portalLink = await this.subscriptionService.GetCustomerPortalUrl(user, req);
    return portalLink;
  }

  @Authorized(UserRoles.Owner)
  @Put("/subscription/adjust-seats")
  async AdjustSeats(
    @Body() data: AdjustSeatsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.AdjustSeats(data, user);
    return subscription;
  }

  @Authorized(UserRoles.Owner)
  @Post("/subscription/unsubscribe")
  async UnsubscribeSubscription(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.Unsubscribe(user);
    return subscription;
  }

  // Used before subscription is cancelled
  @Authorized(UserRoles.Owner)
  @Post("/subscription/resubscribe")
  async ResubscribeSubscription(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.Resubscribe(user);
    return subscription;
  }

  // Used after subscription is cancelled
  @Authorized(UserRoles.Owner)
  @Post("/subscription/renew")
  async RenewSubscription(
    @Body() data: RenewSubscriptionRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.Renew(data, user);
    return subscription;
  }

  @Authorized(UserRoles.Owner)
  @Get("/subscription/checkout")
  async GetCheckoutSessionURL(
    @Query() data: CreateCheckoutSessionRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const checkoutSessionURL = await this.subscriptionService.GetCheckoutSessionURL(data, user, req);
    return checkoutSessionURL;
  }

  @Authorized(UserRoles.Owner)
  @Get("/subscription/preview-change")
  async PreviewSubscriptionChange(
    @Query() data: PreviewSubscriptionChangeRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.PreviewSubscriptionChange(data, user);
    return subscription;
  }

  @Authorized(UserRoles.Owner)
  @Post("/subscription/change-price")
  async ChangeSubscriptionPrice(
    @Body() data: ChangeSubscriptionPriceRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    if (data.price_id == 0) {
      throw new BadRequestException("The requested tiered plan is unavailable.");
    }
    const subscription = await this.subscriptionService.ChangeSubscriptionPrice(
      data.price_id,
      user.company_id
    );
    return subscription;
  }

  @Authorized(UserRoles.Owner)
  @Put("/subscription/apply-promo")
  async ApplyPromoCode(
    @Body() params: ApplyPromoCodeRequest,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.ApplyPromoCode(params.promo_code, user);
    return subscription;
  }
}