import {
  IRedisUserModel,
  UserRoles,
} from "../../../app/model/user/UserModel";

import { Request, Response } from "express";
import {
  UpdateUserRequest,
  ChangePasswordRequest,
  AddUserRequest,
  DeleteUsersRequest,
  UserSearchRequest,
  SetPasswordRequest,
  UpdateLoggedInUserRequest,
  UpdateUserFiltersRequest,
  UpdateTooltipRequest,
  UserBusinessAreasSearchRequest,
  ConfigureMfa,
  VerifyMfaConfiguration,
} from "./UserRequest";
import { UserService } from "../../../app/service/user/UserService";
import {
  Body,
  Post,
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Put,
  Delete,
  Param,
  Req,
  UploadedFile,
  Patch,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { GetMulterObj } from "../../../app/service/aws/MediaService";
import { ImageMimeTypes } from "../../../app/service/aws/ImageMimeTypes";

@ApiTags()
@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/user/add")
  async AddUserToCompany(
    @Body() data: AddUserRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    const userLogginInfo = await this.userService.AddUser(req, data, user);
    return userLogginInfo;
  }

  @Authorized()
  @Put("/user/:userId([0-9]+)")
  async UpdateUserByUserId(
    @Param("userId") userId: number,
    @Body() data: UpdateUserRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    data.email = data.email.toLowerCase();
    const updatedUser = await this.userService.UpdateUser(userId, data, user);
    return updatedUser;
  }

  @Authorized()
  @Put("/user")
  async UpdateLoggedInUser(
    @Body() data: UpdateLoggedInUserRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedUser = await this.userService.UpdateLoggedInUser(data, user);
    return updatedUser;
  }

  /** 
   * @deprecated
  */
  @Authorized()
  @Put("/user/filter")
  async UpdateUserFilters(
    @Body() data: UpdateUserFiltersRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedUser = await this.userService.UpdateUserFilters(data, user);
    return updatedUser;
  }

  @Authorized()
  @Put("/user/tooltip")
  async UpdateUserTooltip(
    @Body() data: UpdateTooltipRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedUser = await this.userService.UpdateUserTooltip(data, user);
    return updatedUser;
  }

  @Authorized()
  @Post("/change-password")
  async ChangePassword(
    @Body() data: ChangePasswordRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const userLogginInfo = await this.userService.ChangePassword(data, user);
    return userLogginInfo;
  }

  @Authorized()
  @Get("/users")
  async GetCompanyUsersList(
    @Query() data: UserSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    if (data.business_area_permission) {
      data.business_area_permission = Array.isArray(
        data.business_area_permission
      )
        ? data.business_area_permission
        : [data.business_area_permission];
    }
    const users = await this.userService.GetUsers(data, user);
    return users;
  }

  @Authorized()
  @Get("/users/filter")
  async GetUsersForFilter( 
    @Query() data: UserSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    if (data.business_area_permission) {
      data.business_area_permission = Array.isArray(
        data.business_area_permission
      )
        ? data.business_area_permission
        : [data.business_area_permission];
    }
    const users = await this.userService.GetUsersForFilter(data, user);
    return users;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/user/:userId([0-9]+)")
  async DeleteSingleUser(
    @Param("userId") userId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.userService.DeleteUser(userId, user);
    return users;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/user/delete")
  async DeleteBulkUsers(
    @Body() data: DeleteUsersRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const userLogginInfo = await this.userService.DeleteUsers(data, user);
    return userLogginInfo;
  }

  @Authorized()
  @Post("/user/image")
  async UploadUserImage(
    @UploadedFile("image", { required: true, options: GetMulterObj(ImageMimeTypes) })
    image,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const img = await this.userService.UploadUserImage(user, image);
    return img;
  }

  @Authorized()
  @Delete("/user/image")
  async RemoveUserImage(
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const userInfo = await this.userService.RemoveUserImage(user);
    return userInfo;
  }

  @Post("/set-password/:token")
  async SetPassword(
    @Body() data: SetPasswordRequest,
    @Req() req: Request,
    @Param("token") token: string,
    @Res() res: Response
  ) {
    const response = await this.userService.SetPassword(req, data, token);
    return response;
  }

  @Authorized()
  @Get("/user/business-areas")
  async GetUserBusinessAreas(
    @Query() filter: UserBusinessAreasSearchRequest,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const businessAreas = await this.userService.GetUserBusinessAreas(
      filter,
      user
    );
    return businessAreas;
  }

  @Authorized()
  @Patch("/user/configure-mfa")
  async ConfigureMfa(
    @Body() data: ConfigureMfa,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedUser = await this.userService.ConfigureMfa(data, user);
    return updatedUser;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Patch("/user/configure-mfa/:userId([0-9]+)")
  async ConfigureMfaForUser(
    @Param("userId") userId: number,
    @Body() data: ConfigureMfa,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedUser = await this.userService.ConfigureMfa(data, user, userId);
    return updatedUser;
  }

  @Authorized()
  @Post("/user/verify-mfa-configuration")
  async VerifyMfaConfiguration(
    @Body() data: VerifyMfaConfiguration,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedUser = await this.userService.VerifyMfaConfiguration(
      user,
      data.code
    );
    return updatedUser;
  }

  @Authorized()
  @Put("/user/key-messages/mark-as-read")
  async MarkKeyMessagesAsRead(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.userService.MarkKeyMessagesAsRead(user);
    return true;
  }
}
