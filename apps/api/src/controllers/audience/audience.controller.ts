import { Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Delete, Get, Param, Post, Put, Res } from "@nestjs/common";
import { AudienceService } from "@app/audience";
import { Authorized } from "@app/common/decorators/authorized.decorator";
import { CurrentUser } from "@app/common/decorators/current-user.decorator";
import { UserRoles, IRedisUserModel } from "@app/user/entities/user.entity";
import { CreateAudienceRequest, UpdateAudienceRequest, UpdateAudiencesRequest, GetAudienceRequest, AudienceSearchRequest, DeleteAudienceRequest } from "./AudienceRequest";

@ApiTags()
@Controller()
export class AudienceController {
  constructor(private audienceService: AudienceService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/audience")
  async CreateAudience(
    @Body() data: CreateAudienceRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdAudience = await this.audienceService.CreateAudience(
      data,
      user
    );
    return createdAudience;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/audience/:audienceId")
  async UpdateAudience(
    @Param("audienceId") audienceId: number,
    @Body() data: UpdateAudienceRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedAudience = await this.audienceService.UpdateAudience(
      audienceId,
      data,
      user
    );
    return updatedAudience;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/audience/:audienceId")
  async DeleteAudience(
    @Param("audienceId") audienceId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.audienceService.DeleteAudience([audienceId], user);
    return null;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/audience")
  async UpdateAudiences(
    @Body() data: UpdateAudiencesRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedAudience = await this.audienceService.UpdateAudiences(data);
    return updatedAudience;
  }

  @Authorized()
  @Get("/audience")
  async GetAudience(
    @Query() data: GetAudienceRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.audienceService.GetAudiences(data, user);
    return users;
  }

  @Authorized()
  @Get("/audience/search")
  async SearchAudience(
    @Query() audienceSearchRequest: AudienceSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const audiences = await this.audienceService.SearchAudiences(
      audienceSearchRequest,
      user
    );
    return audiences;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/audience")
  async DeleteAudiences(
    @Query() params: DeleteAudienceRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.audienceService.DeleteAudience(
      params.audience_ids,
      user
    );
    return true;
  }
}
