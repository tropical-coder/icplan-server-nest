import { BaseController } from "../../../../app/controller/base/BaseController";
import { Response } from "express";
import { YammerService } from "../../../../app/service/social/yammer/YammerService";
import {
  Body,
  Post,
  Res,
  JsonController,
  Get,
  CurrentUser,
  UploadedFiles,
  Delete,
  Param,
  BadRequestException,
  QueryParams,
} from "routing-controllers";
import { Authorized } from "../../../../app/decorator/Authorized";
import {
  PostYammerMessageRequest,
  UpdateDraftMessageRequest,
  YammerAccesstokenRequest,
  GetYammerImageRequest,
} from "./YammerRequest";
import { IRedisUserModel } from "../../../../app/model/user/UserModel";
import * as multer from "multer";
import axios from "axios";

const fileMulter = multer({ storage: multer.memoryStorage() });

@ApiTags()
@Controller()
export class YammerController {
  constructor(private yammerService: YammerService) {}

  @Authorized()
  @Post("/yammer/messages")
  async PostYammerMessage(
    @UploadedFiles("file[]", {
      required: false,
      options: fileMulter,
    })
    files: any,
    @Body() data: PostYammerMessageRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const resp = await this.yammerService.PostMessage(data, files, user);
    return resp;
  }

  @Authorized()
  @Post("/yammer/messages/draft")
  async UpdateDraftMessage(
    @UploadedFiles("file[]", {
      required: false,
      options: fileMulter,
    })
    files: any,
    @Body() data: UpdateDraftMessageRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const resp = await this.yammerService.UpdateSocialPost(data, files, user);
    return resp;
  }

  @Authorized()
  @Post("/yammer/token")
  async YammerAccessToken(
    @Body() data: YammerAccesstokenRequest,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.AddYammerAccessToken(data, user);
    return resp;
  }

  @Authorized()
  @Get("/yammer/messages")
  async getMessages(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.GetYammerMessages(user);
    return resp;
  }

  @Authorized()
  @Get("/yammer/groups")
  async getYammerGroups(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.GetYammerGroups(user);
    return resp;
  }

  @Authorized()
  @Get("/yammer/post")
  async getYammerPost(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.GetSavedPost(user);
    return resp;
  }

  @Authorized()
  @Delete("/yammer/post/:postId")
  async deleteYammerPost(
    @Param("postId") postId: string,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.DeleteYammerPost(user, postId);
    return resp;
  }

  @Authorized()
  @Delete("/yammer/disconnect")
  async disconnectYammer(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.DisconnectYammer(user);
    return resp;
  }

  @Authorized()
  @Get("/yammer/user")
  async getYammerUser(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const resp = await this.yammerService.GetYammerUsers(user);
    return resp;
  }

  @Authorized()
  @Get("/yammer/post/:postId")
  async getSocialPost(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel,
    @Param("postId") postId: number
  ) {
    const resp = await this.yammerService.GetSocialPost(postId);
    return resp;
  }

  @Authorized()
  @Get("/yammer/image")
  async getYammerImage(
    @Query() data: GetYammerImageRequest,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const socialIntegration = await this.yammerService.GetYammerToken(user);
    if (!socialIntegration) {
      throw new BadRequestException("Yammer is not connected for this user");
    }

    let response = await axios({
      method: "get",
      url: data.image_url,
      headers: {
        Authorization: `Bearer ${socialIntegration.token}`,
      },
      responseType: "arraybuffer",
    });

    res.writeHead(200, response.headers);
    return Buffer.from(response.data, "binary");
  }
}
