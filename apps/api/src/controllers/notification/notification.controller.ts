
import { Response } from "express";
import { NotificationService } from "../../../app/service/notification/NotificationService";
import {
  Res,
  JsonController,
  Get,
  QueryParams,
  CurrentUser,
  Post,
  Body,
  Delete,
  Param,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { BroadcastNotificationRequest, CreateNotificationRuleRequest } from "./NotificationRequest";

@ApiTags()
@Controller()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Authorized()
  @Get("/notification")
  async GetNotificationsByUser(
    @Query() pagination: PaginationParam,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const notifications = await this.notificationService.GetNotificationsByUserId(
      user.Id,
      pagination
    );
    return notifications;
  }

  @Authorized()
  @Get("/notification/count")
  async GetUnreadCount(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const notificationsCount = await this.notificationService.GetUnreadCount(
      user.Id
    );
    return notificationsCount;
  }

  @Authorized()
  @Post("/notification/mark-as-read")
  async MarkNotificationsAsRead(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.notificationService.MarkAsRead(user.Id);
    return {};
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/notification/broadcast")
  async BroadcastNotification(
    @CurrentUser()
    user: IRedisUserModel,
    @Body() data: BroadcastNotificationRequest,
    @Res() res: Response
  ) {
    await this.notificationService.BroadcastNotification(data, user);
    return {};
  }

  @Authorized()
  @Post("/notification/rule")
  async CreateNotificationRule(
    @CurrentUser()
    user: IRedisUserModel,
    @Body() data: CreateNotificationRuleRequest,
    @Res() res: Response
  ) {
    const notificationRule =
      await this.notificationService.CreateNotificationRule(data, user);
    return notificationRule;
  }

  @Authorized()
  @Delete("/notification/rule/:notificationRuleId([0-9]+)")
  async DeleteNotificationRule(
    @Param("notificationRuleId") notificationRuleId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.notificationService.DeleteNotificationRule(notificationRuleId, user);
    return true;
  }

  @Authorized()
  @Get("/notification/rule")
  async GetNotificationRules(
    @Query() params: PaginationParam,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const notificationRules =
      await this.notificationService.GetNotificationRules(params, user);
    return notificationRules;
  }
}
