
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  AnalyticsRequest,
  GetMostActivePlansRequest,
  GetCommunicationsLiveTodayRequest,
} from "./AnalyticsRequest";
import { AnalyticsService } from "../../../app/service/analytics/AnalyticsService";
import {
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  UseBefore,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { InjectSubdomainMiddleware } from "../../../app/middleware/InjectSubdomainMiddleware";

@ApiTags()
@Controller()
@UseBefore(InjectSubdomainMiddleware)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Authorized()
  @Get("/analytics/frequencies")
  async GetFrequencies(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const response = await this.analyticsService.GetFrequencies(data, user);
    return response;
  }

  @Authorized()
  @Get("/analytics/most-active")
  async GetMostActive(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const response = await this.analyticsService.GetMostActive(data, user);
    return response;
  }

  @Authorized()
  @Get("/v2/analytics/most-active")
  async GetMostActiveV2(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const response = await this.analyticsService.GetMostActiveV2(data, user);
    return response;
  }

  @Authorized()
  @Get("/analytics/most-active/plans")
  async GetMostActivePlans(
    @Query() data: GetMostActivePlansRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const response = await this.analyticsService.GetMostActivePlans(data, user, data._subdomain);
    return response;
  }

  @Authorized()
  @Get("/analytics/communications")
  async GetCommunicationsAndBudgets(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const response = await this.analyticsService.GetCommunicationsAndBudgets(
      data,
      user
    );
    return response;
  }

  @Authorized()
  @Get("/analytics/live-communications")
  async GetCommunicationsLiveToday(
    @Query() data: GetCommunicationsLiveTodayRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const response = await this.analyticsService.GetCommunicationsLiveToday(
      data,
      user
    );
    return response;
  }

  @Authorized()
  @Get("/analytics/heatmap")
  async GetHeatMap(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const events = await this.analyticsService.GetHeatMap(data, user);
    return events;
  }

  @Authorized()
  @Get("/v2/analytics/heatmap")
  async GetAnalyticsHeatMapV2(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const events = await this.analyticsService.GetAnalyticsHeatMapV2(data, user);
    return events;
  }

  @Authorized()
  @Get("/analytics/progress-tracker")
  async GetAnalyticsProgressTracker(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const progressTracker = await this.analyticsService.GetAnalyticsProgressTracker(
      data,
      user
    );
    return progressTracker;
  }

  @Authorized()
  @Get("/analytics/budget")
  async GetAnalyticsBudget(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const budget = await this.analyticsService.GetAnalyticsBudget(
      data,
      user
    );
    return budget;
  }

  @Authorized()
  @Get("/analytics/risk-category-count")
  async GetAnalyticsRiskCategoryCount(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const riskCategoryCount = await this.analyticsService.GetAnalyticsRiskCategoryCount(
      data,
      user
    );
    return riskCategoryCount;
  }

  @Authorized()
  @Get("/analytics/high-risk-plans")
  async GetHighRiskPlans(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const highRiskPlans = await this.analyticsService.GetHighRiskPlans(
      data,
      user
    );
    return highRiskPlans;
  }

  @Authorized()
  @Get("/analytics/ragb-status")
  async GetRAGBStatus(
    @Query() data: AnalyticsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const ragbStatus = await this.analyticsService.GetCompanyRAGBStatus(data, user);
    return ragbStatus;
  }
}
