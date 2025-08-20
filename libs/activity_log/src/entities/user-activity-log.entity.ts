import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserModel } from "../user/UserModel";

export enum ActivityEntity {
  Company = "company",
  User = "user",
  Plan = "plan",
  Communication = "communication",
  Task = "task",
  Folder = "parent_folder",
  StrategicPriority = "strategic_priority",
  BusinessArea = "business_area",
  Location = "location",
  Audience = "audience",
  Channel = "channel",
  ContentType = "content_type",
  Tag = "tag",
  Auth = "auth",
}

export enum Method {
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

@Entity("user_activity_log")
export class UserActivityLogModel extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: "Id",
    type: "bigint",
  })
  Id: number;

  @Column({
    name: "company_id",
    type: "bigint",
    nullable: true,
  })
  company_id: number;

  @Column({
    name: "timestamp",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  timestamp: Date;

  @Column({
    name: "host",
    type: "varchar",
    length: 100,
  })
  host: string;

  @Column({
    name: "user_id",
    type: "bigint",
    nullable: true,
  })
  user_id: number;

  @Column({
    name: "source_ip",
    type: "inet",
    nullable: true,
  })
  source_ip: string;

  @Column({
    name: "method",
    type: "enum",
    enum: Method,
  })
  method: Method;

  @Column({
    name: "endpoint",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  endpoint: string;

  @Column({
    name: "body",
    type: "jsonb",
    nullable: true,
  })
  body: Record<string, any>;
  
  @Column({
    name: "entity",
    type: "varchar",
    length: 50,
  })
  entity: string;

  @Column({
    name: "status_code",
    type: "smallint",
  })
  status_code: number;

  @Column({
    name: "entity_id",
    type: "bigint",
    nullable: true,
  })
  entity_id: number;

  @ManyToOne(() => UserModel, (userModel) => userModel.activity_log)
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;
}