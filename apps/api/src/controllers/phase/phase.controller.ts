import { Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, Res } from "routing-controllers";

import { PhaseService } from "../../../app/service/phase/PhaseService";
import { Authorized } from "../../../app/decorator/Authorized";
import { CreatePhaseRequest, UpdatePhaseRequest } from "./PhaseRequest";
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Response } from "express";

@ApiTags()
@Controller()
export class PhaseController {
  constructor(private phaseService: PhaseService) {}

  @Authorized()
  @Post("/phase")
  async CreatePhase(
    @Body() data: CreatePhaseRequest,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const phase = await this.phaseService.CreatePhase(data, user);

    return phase;
  }

  @Authorized()
  @Put("/phase/:phaseId([0-9]+)")
  async UpdatePhase(
    @Param("phaseId") phaseId: number,
    @Body() data: UpdatePhaseRequest,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const phase = await this.phaseService.UpdatePhase(phaseId, data, user);

    return phase;
  }

  @Authorized()
  @Delete("/phase/:phaseId([0-9]+)")
  async DeletePhase(
    @Param("phaseId") phaseId: number,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response,
  ) {
    await this.phaseService.DeletePhase(phaseId, user);

    return null;
  }
}