
import { Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";
import { SubscriptionService } from "../../../app/service/subscription/SubscriptionService";
import { Body, Get, JsonController, Param, Post, Put, Res } from "routing-controllers";
import { UpdateSubscriptionByAdminRequest } from "./SubscriptionRequest";
import { ChangeSubscriptionPriceRequest } from "../../../api/controller/subscription/SubscriptionRequest";

@ApiTags()
@Controller()
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Authorized()
  @Get("/company/:companyId([0-9]+)/subscription")
  async GetSubscriptionByCompanyId(
    @Param("companyId") companyId: number,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.GetSubscriptionByCompanyId(
      companyId
    );
    return subscription;
  }

  @Authorized()
  @Put("/company/:companyId([0-9]+)/subscription")
  async UpdateSubscription(
    @Param("companyId") companyId: number,
    @Body() data: UpdateSubscriptionByAdminRequest,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.UpdateSubscriptionByAdmin(
      data,
      companyId,
    );
    return subscription;
  }

  @Authorized()
  @Post("/company/:companyId([0-9]+)/subscription/change-price")
  async ChangeSubscriptionPrice(
    @Body() data: ChangeSubscriptionPriceRequest,
    @Param("companyId") companyId: number,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.ChangeSubscriptionPrice(
      data.price_id,
      companyId,
    );
    return subscription;
  }
}
