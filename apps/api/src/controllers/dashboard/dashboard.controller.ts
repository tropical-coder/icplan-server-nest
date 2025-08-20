import { Res, Get, Param, Query } from "@nestjs/common";
import type { Response } from "express";
import { DateRangeRequest, GetCommunicationsForPlanDashboardRequest } from "./DashboardRequest";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { IRedisUserModel } from "@app/user/entities/user.entity";
import { Authorized } from "@app/common/decorators/authorized.decorator";
import { DashboardService } from "@app/dashboard/dashboard.service";
import { CurrentUser } from "@app/common/decorators/current-user.decorator";

@ApiTags("Dashboard")
@Controller()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Authorized()
  @Get("/dashboard/:planId([0-9]+)/combined-budget")
  async GetCombinedBudget(
    @Param("planId") planId: number,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response
  ) {
    const combinedBudget = await this.dashboardService.GetCombinedBudget(
      planId,
      user
    );

    return combinedBudget;
  }

  @Authorized()
  @Get("/dashboard/:planId([0-9]+)/risk-category-count")
  async GetRiskCategoryCount(
    @Param("planId") planId: number,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response
  ) {
    const riskCategoryCount = await this.dashboardService.GetRiskCategoryCount(
      planId,
      user
    );

    return riskCategoryCount;
  }

  @Authorized()
  @Get("/dashboard/:planId([0-9]+)/progress-tracker")
  async GetPlanProgressTrackerData(
    @Param("planId") planId: number,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response
  ) {
    const progressTrackerData =
      await this.dashboardService.GetCommunicationStatusCountGroupedByPhase(planId, user);

    return progressTrackerData;
  }

  @Authorized()
  @Get("/dashboard/:planId([0-9]+)/phase")
  async GetPhasesForPlanDashboard(
    @Param("planId") planId: number,
    @Query() query: DateRangeRequest,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response
  ) {
    const phaseCount = await this.dashboardService.GetPhasesForPlanDashboard(planId, query, user);

    return phaseCount;
  }

  @Authorized()
  @Get("/dashboard/:planId([0-9]+)/communication")
  async GetCommunicationsForPlanDashboard(
    @Param("planId") planId: number,
    @Query() query: GetCommunicationsForPlanDashboardRequest,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response
  ) {
    const phaseCommunications =
      await this.dashboardService.GetCommunicationsForPlanDashboard(planId, query, user);

    return phaseCommunications;
  }
}

