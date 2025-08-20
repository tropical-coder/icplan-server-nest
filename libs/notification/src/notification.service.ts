import { BadRequestException, Get } from 'routing-controllers';
import { UserRepository } from '../../repository/user/UserRepository';
import { CompanyUserLicenseRepository } from '../../repository/company/CompanyUserLicenseRepository';

import { NotificationRepository } from "../../repository/notification/NotificationRepository";
import {
  INotificationModel,
  NotificationModel,
} from "../../model/notification/NotificationModel";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { GetPaginationOptions } from "../../helpers/UtilHelper";
import { SendSocketEvent } from "../../helpers/SocketEmitter";
import { MailService } from "../mail/MailService";
import { IRedisUserModel } from "../../model/user/UserModel";
import { UserSettingModel } from "../../model/user/UserSettingModel";
import { BroadcastNotificationRequest, CreateNotificationRuleRequest } from '../../../api/controller/notification/NotificationRequest';
import { NotificationRuleRepository } from '../../repository/notification/NotificationRuleRepository';
import { NotificationRuleModel } from '../../model/notification/NotificationRuleModel';

interface INotificationUser {
  Id: number;
  full_name: string;
  company_id: number;
  email: string;
  user_setting: any;
  is_deleted: number;
}

@Injectable()
export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private mailService: MailService,
    private companyUserLicenseRepository: CompanyUserLicenseRepository,
    private userRepository: UserRepository,
    private notificationRuleRepository: NotificationRuleRepository,
  ) {}

  private async SendSocketAndEmail(
    data: NotificationModel,
    user: INotificationUser,
  ) {
    const room = `User-${user.Id}`;
    SendSocketEvent("notification", room, data);

    if (user.user_setting?.receive_email_notification) {
      const { settings } = await this.companyUserLicenseRepository.FindOne({
        company_id: user.company_id,
      });
      
      const subdomain = settings.subdomains.find((elem) => elem != "app") || "app";

      let entityLink = `https://${subdomain}.icplan.com/#/`;
      const info: any = data.info;
  
      if (info.task_id) {
        entityLink += `tasks?taskId=${info.task_id}`;
      } else if (info.communication_id) {
        entityLink += `plans/communication/${info.communication_id}/overview`
      } else if (info.plan_id) {
        entityLink += `plans/plan/${info.plan_id}/overview`;
      }

      if (info.comment_id) {
        entityLink += `?openComments=true`
      }

      const replacements = {
        NotificationTitle: data.title,
        NotificationBody: data.body,
        EntityLink: entityLink,
        FullName: user.full_name,
      };

      const mailOptions = {
        to: user.email,
        subject: data.title,
        from: "notification@icplan.com",
      };

      await this.mailService.SendMail(
        "notification.html",
        replacements,
        mailOptions,
        subdomain,
      );
    }
    return true;
  }

  public async GetNotificationsByUserId(
    userId: number,
    pagination: PaginationParam
  ): Promise<{
    notifications: NotificationModel[] | number;
    count: number | any;
  }> {
    const { notifications, count } =
      await this.notificationRepository.GetNotificationsByUserId(
        userId,
        GetPaginationOptions(pagination)
      );

    return { notifications, count };
  }

  public async GetUnreadCount(userId: number): Promise<{ unread: number }> {
    const unread = await this.notificationRepository.GetUnreadCount(userId);
    return { unread };
  }

  public async MarkAsRead(userId: number) {
    await this.notificationRepository.Update(
      { user_id: userId },
      { read: true }
    );
    return true;
  }

  public async SendNotification(
    data: INotificationModel,
    users: INotificationUser[],
    setting_key?: keyof UserSettingModel
  ) {
    users.forEach(async (user) => {
      // Check if user has enabled the particular notification toggle
      if (
        (setting_key && user.user_setting && !user.user_setting[setting_key]) ||
        user.is_deleted
      ) {
        return false;
      }
      data.user_id = user.Id;
      const notificationModel =
        await this.notificationRepository.CreateNotification(data);

      await this.SendSocketAndEmail(notificationModel, user);
    });

    return true;
  }

  public async BroadcastNotification(
    data: BroadcastNotificationRequest,
    user: IRedisUserModel,
  ) {
    const users = await this.userRepository.Find(
      { 
        company_id: user.company_id,
        is_deleted: 0,
      },
    );

    await this.SendNotification(
      {
        notification_type: 0,
        title: data.title,
        body: data.body || "",
        info: { sender_id: user.Id }
      },
      users,
    );

    return true;
  }

  public async CreateNotificationRule(
    data: CreateNotificationRuleRequest,
    user: IRedisUserModel
  ) {
    const ruleExist = await this.notificationRuleRepository.FindOne({
      entity: data.entity,
      entity_id: data.entity_id,
      user_id: user.Id,
    });

    if (ruleExist) {
      throw new BadRequestException("This rule already exists");
    }

    const ruleModel = new NotificationRuleModel();
    ruleModel.entity = data.entity;
    ruleModel.entity_id = data.entity_id;
    ruleModel.user_id = user.Id;

    await this.notificationRuleRepository.Create(ruleModel);

    const rule = await this.notificationRuleRepository.GetNotificationRuleById(
      ruleModel.Id, user,
    );

    return rule;
  }

  public async DeleteNotificationRule(notificationRuleId: number, user: IRedisUserModel) {
    const rule = await this.notificationRuleRepository.FindOne({
      Id: notificationRuleId,
      user_id: user.Id,
    });

    if (!rule) {
      throw new BadRequestException("Rule not found");
    }

    await this.notificationRuleRepository.DeleteById(rule.Id, false);
    return true;
  }

  public async GetNotificationRules(data: PaginationParam, user: IRedisUserModel) {
    const rules = await this.notificationRuleRepository.GetNotificationRules(data, user);

    return rules;
  }
}
