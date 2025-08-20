import { Body, Controller, CurrentUser, Delete, Get, Param, Post, QueryParams, Res } from "routing-controllers";
import { Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";

import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { KeyMessagesService } from "../../../app/service/key_messages/KeyMessagesService";
import { GetKMRequest, UpdateKMRequest } from "./KeyMessagesRequest";

@Controller()
export class KeyMessagesController {
  constructor(private keyMessagesService: KeyMessagesService) {}

  @Authorized()
  @Post("/key_messages")
  async UpdateKeyMessages(
    @Body() data: UpdateKMRequest,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const keyMessages = await this.keyMessagesService.UpdateKeyMessage(data, user);
    return keyMessages;
  }

  @Authorized()
  @Get("/key_messages")
  async GetKeyMessages(
    @Query() data: GetKMRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const keyMessages = await this.keyMessagesService.GetKeyMessages(data, user);
    return keyMessages;
  }

  @Authorized()
  @Delete("/key_messages/:keyMessageId([0-9]+)")
  async DeleteKeyMessages(
    @Param("keyMessageId") keyMessageId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const result = await this.keyMessagesService.DeleteKeyMessage(keyMessageId, user);
    return result;
  }

  @Authorized()
  @Get("/key_messages/nearest")
  async GetNearestKeyMessages(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const km = await this.keyMessagesService.GetNearestKeyMessage(user);
    return km;
  }
}