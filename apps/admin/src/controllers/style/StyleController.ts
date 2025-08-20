import { Get, Post, Put, Delete, JsonController, Param, Res, QueryParams, Body } from "routing-controllers";

import { StyleService } from "../../../app/service/style/StyleService";
import { Authorized } from "../../../app/decorator/Authorized";
import { Response } from "express";
import { CreateStyleRequest, GetStylesRequest, UpdateStyleRequest } from "./StyleRequest";

@ApiTags()
@Controller()
export class StyleController {
  constructor(private styleService: StyleService) {}

  @Authorized()
  @Get("/style")
  async GetStyles(
    @Query() params: GetStylesRequest,
    @Res() res: Response
  ) {
    const styles = await this.styleService.GetStyles(params);
    return styles;
  }

  @Authorized()
  @Get("/style/:styleId([0-9]+)")
  async GetStyleById(
    @Param("styleId") styleId: number,
    @Res() res: Response,
  ) {
    const style = await this.styleService.GetStyleById(styleId);

    return style;
  }

  @Authorized()
  @Post("/style")
  async CreateStyle(
    @Body() data: CreateStyleRequest,
    @Res() res: Response,
  ) {
    const style = await this.styleService.CreateStyle(data);
    return style;
  }

  @Authorized()
  @Put("/style/:styleId([0-9]+)")
  async UpdateStyle(
    @Param("styleId") styleId: number,
    @Body() data: UpdateStyleRequest,
    @Res() res: Response,
  ) {
    const style = await this.styleService.UpdateStyle(styleId, data);
    return style;
  }

  @Authorized()
  @Delete("/style/:styleId([0-9]+)")
  async DeleteStyle(
    @Param("styleId") styleId: number,
    @Res() res: Response,
  ) {
    await this.styleService.DeleteStyle(styleId);
    return true;
  }

  @Authorized()
  @Post("/style/refresh-cache")
  async RefreshCache(
    @Res() res: Response,
  ) {
    await this.styleService.UpdateCache();
    return true;
  }
}