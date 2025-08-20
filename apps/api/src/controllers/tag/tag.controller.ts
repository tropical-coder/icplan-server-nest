import { PaginationParam } from "../../../app/controller/base/BaseRequest";

import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  CreateTagRequest,
  UpdateTagRequest,
  TagSearchRequest,
  UpdateTagsRequest,
  GetTagsRequest,
  DeleteTagsRequest,
} from "./TagRequest";
import { TagService } from "../../../app/service/tag/TagService";
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
export class TagController {
  constructor(private tagService: TagService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/tag")
  async CreateTag(
    @Body() data: CreateTagRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdTag = await this.tagService.CreateTag(data, user);
    return createdTag;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/tag/:tagId")
  async UpdateTag(
    @Param("tagId") tagId: number,
    @Body() data: UpdateTagRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedTag = await this.tagService.UpdateTag(tagId, data);
    return updatedTag;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/tag/:tagId")
  async DeleteTag(
    @Param("tagId") tagId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.tagService.DeleteTag([tagId], user);
    return null;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/tag")
  async UpdateTags(
    @Body() data: UpdateTagsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedTag = await this.tagService.UpdateTags(data);
    return updatedTag;
  }

  @Authorized()
  @Get("/tag")
  async GetTags(
    @Query() data: GetTagsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.tagService.GetTags(data, user);
    return users;
  }

  @Authorized()
  @Get("/tag/search")
  async SearchTag(
    @Query() tagSearchRequest: TagSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const tags = await this.tagService.SearchTags(tagSearchRequest, user);
    return tags;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/tag")
  async DeleteTags(
    @Query() params: DeleteTagsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.tagService.DeleteTag(params.tag_ids, user);
    return true;
  }
}
