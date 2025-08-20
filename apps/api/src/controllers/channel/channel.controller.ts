
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelSearchRequest,
  UpdateChannelsRequest,
  GetChannelRequest,
  UpdateChannelStatusRequest,
  DeleteChannelsRequest,
} from "./ChannelRequest";
import { ChannelService } from "../../../app/service/channel/ChannelService";
import {
  Body,
  Post,
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Put,
  Param,
  Delete,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";

@ApiTags()
@Controller()
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/channel")
  async CreateChannel(
    @Body() data: CreateChannelRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdChannel = await this.channelService.CreateChannel(data, user);
    return createdChannel;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/channel/:channelId")
  async UpdateChannel(
    @Param("channelId") channelId: number,
    @Body() data: UpdateChannelRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedChannel = await this.channelService.UpdateChannel(
      channelId,
      data,
      user
    );
    return updatedChannel;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/channel/:channelId")
  async DeleteChannel(
    @Param("channelId") channelId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.channelService.DeleteChannel([channelId], user);
    return null;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/channel")
  async UpdateChannels(
    @Body() data: UpdateChannelsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedChannel = await this.channelService.UpdateChannels(data);
    return updatedChannel;
  }

  @Authorized()
  @Get("/channel")
  async GetChannels(
    @Query() data: GetChannelRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.channelService.GetChannels(data, user);
    return users;
  }

  @Authorized()
  @Get("/channel/search")
  async SearchChannel(
    @Query() channelSearchRequest: ChannelSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const channels = await this.channelService.SearchChannels(
      channelSearchRequest,
      user
    );
    return channels;
  }

  @Authorized()
  @Put("/channel/:channelId/status")
  async ArchiveChannel(
    @Param("channelId") channelId: number,
    @Body() data: UpdateChannelStatusRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const channel = await this.channelService.UpdateChannelStatus(
      channelId,
      data,
      user
    );
    return channel;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/channel")
  async DeleteChannels(
    @Query() params: DeleteChannelsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    await this.channelService.DeleteChannel(params.channel_ids, user);
    return true;
  }
}
