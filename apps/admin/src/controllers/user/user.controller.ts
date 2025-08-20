import { Controller, Get, Post, Put, Param, Body, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { IRedisAdminModel } from "@app/administrator/entities/administrator.entity";
import { UserService } from "@app/user/user.service";
import { Authorized } from "@app/common/decorators/authorized.decorator";
import { AddUserRequest, GetAllUsersRequest, RevokeMfa } from "@app/user/dto/user.dto";
import type { Request } from "express";
import { CurrentUser } from "@app/common/decorators/current-user.decorator";

@ApiTags('user')
@Controller()
export class UserController {
  constructor(private userService: UserService) {
  }

  @Authorized()
  @Get("/users")
  async GetUsers(
    @Query() params: GetAllUsersRequest
  ): Promise<any> {
    const users = await this.userService.GetAllUsers(params);
    return users;
  }

  @Authorized()
  @Post("/user/add")
  async AddUserToCompany(
    @Body() data: AddUserRequest,
    @Req() req: Request,
  ): Promise<any> {
    data.email = data.email.toLowerCase();
    const userLogginInfo = await this.userService.AddUser(req, data, {
      company_id: data.company_id
    });
    return userLogginInfo
;
  }

  @Authorized()
  @Get("/user/:userId")
  async GetUserById(
    @Param("userId") userId: number
  ): Promise<any> {
    const user = await this.userService.GetUser(userId);
    return user
;
  }

  @Authorized()
  @Put("/user/revoke-mfa")
  async revokeMfa(
    @Body() data: RevokeMfa
  ): Promise<any> {
    const revokedMfa = await this.userService.RevokeMfa(data);
    return revokedMfa
;
  }

  @Authorized()
  @Put("/user/:userId")
  async UpdateUser(
    @Param("userId") userId: number,
    @Body() data: AddUserRequest,
    @CurrentUser()
    user: IRedisAdminModel
  ): Promise<any> {
    data.email = data.email.toLowerCase();
    const userInfo = await this.userService.UpdateUser(
      userId,
      data,
      {
        company_id: data.company_id
      },
      true
    );
    return userInfo;
  }
}
