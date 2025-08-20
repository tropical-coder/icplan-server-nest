import { Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, Res } from "routing-controllers";

import { RiskService } from "../../../app/service/risk/RiskService";
import { CreateRiskRequest, GetRisksRequest } from "./RiskRequest";
import { Authorized } from "../../../app/decorator/Authorized";
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Response } from "express";

@ApiTags()
@Controller()
export class RiskController {
  constructor(private riskService: RiskService) {}

  @Authorized()
  @Post("/risk")
  async CreateRisk(
    @Body() data: CreateRiskRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const risk = await this.riskService.CreateRisk(data, user);

    return risk;
  }

  @Authorized()
  @Put("/risk/:riskId([0-9]+)")
  async UpdateRisk(
    @Param("riskId") riskId: number,
    @Body() data: CreateRiskRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const risk = await this.riskService.UpdateRisk(riskId, data, user);

    return risk;
  }

  @Authorized()
  @Delete("/risk/:riskId([0-9]+)")
  async DeleteRisk(
    @Param("riskId") riskId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    await this.riskService.DeleteRisk(riskId, user);

    return null;
  }

  @Authorized()
  @Get("/risk")
  async GetRisks(
    @Query() data: GetRisksRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const risks = await this.riskService.GetRisks(data, user);

    return risks;
  }
}