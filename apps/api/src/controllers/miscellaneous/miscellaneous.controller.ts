
import { UserRoles, IRedisUserModel } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";
import { appEnv } from "../../../app/helpers/EnvHelper";
import { PlanService } from "../../../app/service/plan/PlanService";
import { CalendarEventRequest } from "../calendar/CalendarRequest";
import { isArray } from "util";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";
import { StyleService } from "../../../app/service/style/StyleService";
import { StripeService } from "../../../app/service/stripe/StripeService";
import { InjectSubdomainMiddleware } from "../../../app/middleware/InjectSubdomainMiddleware";
import { ApiTags } from "@nestjs/swagger";
import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "@app/common/decorators/current-user.decorator";

@ApiTags('Miscellaneous')
@Controller()
export class MiscellaneousController {
  constructor(
    private planService: PlanService,
    private styleService: StyleService,
    private stripeService: StripeService,
   ) {}

  @Get("/miscellaneous/icplan-info")
  async GetCompnayInfo() {
    const icplan = {
      support: appEnv("ICPLAN_SUPPORT"),
      phone: appEnv("ICPLAN_PHONE"),
      email: appEnv("ICPLAN_EMAIL"),
    };
    return icplan;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Get("/miscellaneous/gantt-chart")
  async GetPlansAndComms(
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const plans = await this.planService.GetPlansAndComms(user);
    return plans;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/miscellaneous/report")
  async GetExcelReport(
    @Query()
    data: CalendarEventRequest,
    @CurrentUser()
    user: IRedisUserModel,
  ) {
    if (data.status) {
      data.status = isArray(data.status) ? data.status : [data.status];
    }
    const plans = await this.planService.GetExcelReport(data, user, data._subdomain);
    return plans;
  }

  @Get("/miscellaneous/app-version")
  async GetAppVersion() {
    const version = appEnv("APP_VERSION", "0.9.0");
    return { version };
  }

  @Get("/miscellaneous/styles")
  async GetStyles(@Req() req: Request) {
    let subdomain = req.subdomains[req.subdomains.length - 1];
    if (!subdomain) {
      subdomain = "default";
    }
    const css = await this.styleService.GetCSSBySubdomain(subdomain);

    res.setHeader("Content-Type", "text/css");
    return res.status(200).send(css);
  }

  @Post("/stripe/webhook")
  async HandleStripeEvent(@Req() req: Request) {
    await this.stripeService.HandleStripeEvent(req);
    return "Webhook handled successfully";
  }

  @Get("/miscellaneous/environment")
  async GetEnvironment() {
    const environment = appEnv("ENVIRONMENT");
    return { environment };
  }
}
