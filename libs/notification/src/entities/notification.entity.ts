import { BaseModel } from "@app/common/base/base.model";
import { UserModel } from "@app/user/entities/user.entity";
import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";

@Entity("notification")
export class NotificationModel extends BaseModel {
  @Column({
    name: "notification_type",
    type: "smallint",
  })
  notification_type: number;

  @Column({
    name: "title",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  title: string;

  @Column({
    name: "body",
    type: "varchar",
    length: 512,
    nullable: false,
  })
  body: string;

  @Index()
  @Column({
    name: "user_id",
    type: "bigint",
    nullable: false,
  })
  user_id: number;

  @Column({
    name: "read",
    type: "boolean",
    default: false,
  })
  read: boolean;

  @Column({
    name: "info",
    type: "jsonb",
    nullable: true,
  })
  info: {};

  @ManyToOne((type) => UserModel, (userModel) => userModel.notification, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;
}

export interface INotificationModel {
  user_id?: number;
  notification_type: number;
  title: string;
  body: string;
  info?: Record<string, any>;
}
