import type { IRedisUserModel } from "@app/user/entities/user.entity";
import { UserRoles } from "@app/user/entities/user.entity";
import type { Response } from "express";
import {
  CreateContentTypeRequest,
  UpdateContentTypeRequest,
  ContentTypeSearchRequest,
  UpdateContentTypesRequest,
} from "./ContentTypeRequest";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Authorized } from "@app/common/decorators/authorized.decorator";
import { CurrentUser } from "@app/common/decorators/current-user.decorator";
import { ContentTypeService } from "@app/content_type/content_type.service";
import { PaginationParam } from "@app/common/base/base.request";

@ApiTags("Content Type")
@Controller()
export class ContentTypeController {
  constructor(private contentTypeService: ContentTypeService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/content-type")
  async CreateContentType(
    @Body() data: CreateContentTypeRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdContentType = await this.contentTypeService.CreateContentType(
      data,
      user
    );
    return createdContentType;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/content-type/:contentTypeId")
  async UpdateContentType(
    @Param("contentTypeId") contentTypeId: number,
    @Body() data: UpdateContentTypeRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedContentType = await this.contentTypeService.UpdateContentType(
      contentTypeId,
      data,
      user
    );
    return updatedContentType;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/content-type/:contentTypeId")
  async DeleteContentType(
    @Param("contentTypeId") contentTypeId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.contentTypeService.DeleteContentType(contentTypeId);
    return null;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/content-type")
  async UpdateContentTypes(
    @Body() data: UpdateContentTypesRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedContentType = await this.contentTypeService.UpdateContentTypes(
      data
    );
    return updatedContentType;
  }

  @Authorized()
  @Get("/content-type")
  async GetContentType(
    @Query() data: PaginationParam,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.contentTypeService.GetContentTypes(data, user);
    return users;
  }

  @Authorized()
  @Get("/content-type/search")
  async SearchContentType(
    @Query() contentTypeSearchRequest: ContentTypeSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const contentTypes = await this.contentTypeService.SearchContentTypes(
      contentTypeSearchRequest,
      user
    );
    return contentTypes;
  }
}
