import { Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParam, Res } from "routing-controllers";
import { PlanService } from "../../../app/service/plan/PlanService";
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Authorized } from "../../../app/decorator/Authorized";

import { Response } from "express";
import { CreatePlanBudgetRequest, UpdatePlanBudgetRequest } from "./BudgetRequest";


@ApiTags()
@Controller()
export class BudgetController {
  constructor(private planService: PlanService) {}

  @Authorized()
  @Get("/budget")
  async GetBudgets(
    @QueryParam("plan_id") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const budgets = await this.planService.GetBudgets(planId, user);
    return budgets;
  }

  @Authorized()
  @Post("/budget")
  async CreatePlanBudget(
    @Body() data: CreatePlanBudgetRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const budget = await this.planService.CreatePlanBudget(data, user);
    return budget;
  }

  @Authorized()
  @Put("/budget/:budgetId([0-9]+)")
  async UpdatePlanBudget(
    @Param("budgetId") budgetId: number,
    @Body() data: UpdatePlanBudgetRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const budget = await this.planService.UpdatePlanBudget(budgetId, data, user);
    return budget;
  }

  @Authorized()
  @Delete("/budget/:budgetId([0-9]+)")
  async DeleteBudget(
    @Param("budgetId") budgetId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    await this.planService.DeleteBudget(budgetId, user);
    return {};
  }
}