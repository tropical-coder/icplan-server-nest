import { PaginationParam } from "../../../app/controller/base/BaseRequest";

import {
  IRedisUserModel,
  UserRoles,
} from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  CreateStrategicPriorityRequest,
  UpdateStrategicPriorityRequest,
  StrategicPrioritySearchRequest,
  UpdateStrategicPrioritiesRequest,
  DeleteStrategicPriorities,
  GetStrategicPriorities,
} from "./StrategicPriorityRequest";
import { StrategicPriorityService } from "../../../app/service/strategic_priority/StrategicPriorityService";
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
export class StrategicPriorityController {
  constructor(private strategicPriorityService: StrategicPriorityService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/strategic-priority")
  async CreateStrategicPriority(
    @Body() data: CreateStrategicPriorityRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdStrategicPriority = await this.strategicPriorityService.CreateStrategicPriority(
      data,
      user
    );
    return createdStrategicPriority;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/strategic-priority/:strategicPriorityId")
  async UpdateStrategicPriority(
    @Param("strategicPriorityId") strategicPriorityId: number,
    @Body() data: UpdateStrategicPriorityRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedStrategicPriority = await this.strategicPriorityService.UpdateStrategicPriority(
      strategicPriorityId,
      data,
      user
    );
    return updatedStrategicPriority;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/strategic-priority/:strategicPriorityId")
  async DeleteStrategicPriority(
    @Param("strategicPriorityId") strategicPriorityId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.strategicPriorityService.DeleteStrategicPriority(
      [strategicPriorityId],
      user
    );
    return null;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/strategic-priority")
  async UpdateStrategicPriorities(
    @Body() data: UpdateStrategicPrioritiesRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedStrategicPriority = await this.strategicPriorityService.UpdateStrategicPriorities(
      data
    );
    return updatedStrategicPriority;
  }

  @Authorized()
  @Get("/strategic-priority")
  async GetStrategicPriorities(
    @Query() data: GetStrategicPriorities,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.strategicPriorityService.GetStrategicPrioritys(
      data,
      user
    );
    return users;
  }

  @Authorized()
  @Get("/strategic-priority/search")
  async SearchStrategicPriority(
    @Query()
    strategicPrioritySearchRequest: StrategicPrioritySearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const strategicPrioritys = await this.strategicPriorityService.SearchStrategicPrioritys(
      strategicPrioritySearchRequest,
      user
    );
    return strategicPrioritys;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/strategic-priority")
  async DeleteStrategicPriorities(
    @Query() params: DeleteStrategicPriorities,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.strategicPriorityService.DeleteStrategicPriority(
      params.strategic_priority_ids, 
      user
    );
    return true;
  }
}
