import { AudienceModel } from "@app/audience/entities/audience.entity";
import { ChannelModel } from "@app/channel/entities/channel.entity";
import { BaseModel } from "@app/common/base/base.model";
import { PlanModel } from "@app/plan/entities/plan.entity";
import { StrategicPriorityModel } from "@app/strategic_priority/entities/strategic-priority.entity";
import { TagModel } from "@app/tag/entities/tag.entity";
import { UserModel } from "@app/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

export enum NotificationRuleEntity {
  Channel = "channel",
  Audience = "audience",
  StrategicPriority = "strategic_priority",
  Tag = "tag",
  Plan = "plan",
}

@Entity("notification_rule")
export class NotificationRuleModel extends BaseModel {
  @Column({
    name: "user_id",
    type: "bigint",
  })
  user_id: number;

  @Column({
    name: "entity",
    type: "enum",
    enum: NotificationRuleEntity,
  })
  entity: NotificationRuleEntity;

  @Column({
    name: "entity_id",
    type: "bigint",
  })
  entity_id: number;

  channel: ChannelModel;
  audience: AudienceModel;
  strategic_priority: StrategicPriorityModel;
  tag: TagModel;
  plan: PlanModel;

  @ManyToOne((type) => UserModel, (userModel) => userModel.notification_rules, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;
}