import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { INotificationModel, NotificationModel } from "@app/notification/entities/notification.entity";

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationModel> {
  constructor(
    @InjectRepository(NotificationModel)
    private notificationModelRepository: Repository<NotificationModel>,
  ) {
    super(notificationModelRepository);
  }

  public async CreateNotification(data: INotificationModel) {
    let notificationModel = new NotificationModel();
    notificationModel.user_id = data.user_id;
    notificationModel.notification_type = data.notification_type;
    notificationModel.title = data.title;
    notificationModel.body = data.body;
    notificationModel.info = data.info || {};

    notificationModel = await this.Create(notificationModel);
    return notificationModel;
  }

  public async GetNotificationsByUserId(userId: number, paginationParam) {
    const [notifications, count] = await this.notificationModelRepository.createQueryBuilder(
      "notification"
    )
      .leftJoin("notification.user", "user")
      .where(`notification.user_id = :userId`, { userId })
      .orderBy("notification.created_at", "DESC")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return { notifications, count };
  }

  public async GetUnreadCount(userId: number) {
    const count = await this.notificationModelRepository.createQueryBuilder("notification")
      .where(`notification.user_id = :userId`, { userId })
      .andWhere("notification.read = false")
      .getCount();

    return count;
  }
}
