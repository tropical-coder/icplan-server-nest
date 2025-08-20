import { CurrentUser, Get, JsonController, Param, Put, QueryParams, Res, Post, Delete, Body} from "routing-controllers";

import { CommunicationService } from "../../../app/service/communication/CommunicationService";
import { Authorized } from "../../../app/decorator/Authorized";
import { Response } from "express";
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { UpdateCommunicationRRule } from "./RecurringCommunicationRequest";

@ApiTags()
@Controller()
export class RecurringCommunicationController {
  constructor(private communicationService: CommunicationService) {}

  // TODO: move this to Communication Controller and delete the controller
  @Authorized()
  @Put("/communication/recurring/:communicationId([0-9]+)")
  async UpdateCommunicationRRule(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateCommunicationRRule,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const comm = await this.communicationService.UpdateCommunicationRRule(
      communicationId,
      data,
      user,
    );
    return comm;
  }
}