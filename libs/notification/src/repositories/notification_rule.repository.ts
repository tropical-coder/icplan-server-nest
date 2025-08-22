import { BaseRepository } from "@app/common/base/base.repository";
import { NotificationRuleModel } from "../entities/notification_rule.entity";
import { IRedisUserModel } from "@app/user/entities/user.entity";
import { ChannelModel } from "@app/channel/entities/channel.entity";
import { AudienceModel } from "@app/audience/entities/audience.entity";
import { StrategicPriorityModel } from "@app/strategic_priority/entities/strategic-priority.entity";
import { TagModel } from "@app/tag/entities/tag.entity";
import { PlanModel } from "@app/plan/entities/plan.entity";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GetPaginationOptions } from "@app/common/helpers/misc.helper";

@Injectable()
export class NotificationRuleRepository extends BaseRepository<NotificationRuleModel> {
  constructor(
    @InjectRepository(NotificationRuleModel)
    private notificationRuleRepository: Repository<NotificationRuleModel>,
  ) {
    super(notificationRuleRepository);
  }


  public async GetNotificationRules(data, user: IRedisUserModel) {
    const entities = {
      channel: ChannelModel,
      audience: AudienceModel,
      strategic_priority: StrategicPriorityModel,
      tag: TagModel,
      plan: PlanModel,
    };

    const pagination = GetPaginationOptions(data);
    let notificationRuleQb = this.Repository
      .createQueryBuilder("notification_rule");

    for (const [key, value] of Object.entries(entities)) {
      notificationRuleQb = notificationRuleQb.leftJoinAndMapOne(
        `notification_rule.${key}`,
        value,
        key,
        `notification_rule.entity = '${key}'
          AND notification_rule.entity_id = ${key}."Id"
          AND ${key}.company_id = ${user.company_id}`
      );
    }
    const [notification_rule, count] = await notificationRuleQb
      .select([
        "notification_rule",
        `channel."Id"`,
        `channel.name`,
        `audience."Id"`,
        `audience.name`,
        `strategic_priority."Id"`,
        `strategic_priority.name`,
        `tag."Id"`,
        `tag.name`,
        `plan."Id"`,
        `plan.title`,
      ])
      .where("notification_rule.user_id = :userId", { userId: user.Id })
      .orderBy("notification_rule.created_at", "DESC")
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { notification_rule, count };
  }

  public async GetNotificationRuleById(Id: number, user: IRedisUserModel) {
    let entities: { [key: string]: Function } = {
      channel: ChannelModel,
      audience: AudienceModel,
      strategic_priority: StrategicPriorityModel,
      tag: TagModel,
      plan: PlanModel,
    };

    let notificationRuleQb = this.Repository
      .createQueryBuilder("notification_rule");

    for (const [key, value] of Object.entries(entities)) {
      notificationRuleQb = notificationRuleQb.leftJoinAndMapOne(
        `notification_rule.${key}`,
        value,
        key,
        `notification_rule.entity = '${key}'
          AND notification_rule.entity_id = ${key}."Id"
          AND ${key}.company_id = ${user.company_id}`
      );
    }

    const notification_rule = await notificationRuleQb
      .select([
        "notification_rule",
        `channel."Id"`,
        `channel.name`,
        `audience."Id"`,
        `audience.name`,
        `strategic_priority."Id"`,
        `strategic_priority.name`,
        `tag."Id"`,
        `tag.name`,
        `plan."Id"`,
        `plan.title`,
      ])
      .where("notification_rule.user_id = :userId", { userId: user.Id })
      .andWhere("notification_rule.Id = :Id", { Id })
      .getOne();

    return notification_rule;
  }
}
