import { PaginationParam } from "../../../app/controller/base/BaseRequest";

import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  CreateColorRequest,
  UpdateColorRequest,
  ColorSearchRequest,
} from "./ColorRequest";
import { ColorService } from "../../../app/service/color/ColorService";
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
export class ColorController {
  constructor(private colorService: ColorService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/color")
  async CreateColor(
    @Body() data: CreateColorRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdColor = await this.colorService.CreateColor(data, user);
    return createdColor;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/color/:colorId")
  async UpdateColor(
    @Param("colorId") colorId: number,
    @Body() data: UpdateColorRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedColor = await this.colorService.UpdateColor(
      colorId,
      data,
      user
    );
    return updatedColor;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/color/:colorId")
  async DeleteColor(
    @Param("colorId") colorId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.colorService.DeleteColor(colorId, user);
    return null;
  }

  @Authorized()
  @Get("/color")
  async GetColor(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.colorService.GetColors(user);
    return users;
  }

  @Authorized()
  @Get("/color/search")
  async SearchColor(
    @Query() colorSearchRequest: ColorSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const colors = await this.colorService.SearchColors(
      colorSearchRequest,
      user
    );
    return colors;
  }
}
