import { BaseEntity, Column, Entity, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Method } from "./UserActivityLogModel"
import { AdminModel } from "../admin/AdminModel";

export enum ActivityEntity {
  Company = "company",
  User = "user",
  Admin = "admin",
  Style = "style",
  Package = "package",
  Subscription = "subscription",
}

@Entity("admin_activity_log")
export class AdminActivityLogModel extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: "Id",
    type: "bigint",
  })
  Id: number;

  @Column({
    name: "timestamp",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  timestamp: Date;

  @Column({
    name: "admin_id",
    type: "bigint",
    nullable: true,
  })
  admin_id: number;

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

  @OneToMany(() => AdminModel, (adminModel) => adminModel.activity_log)
  @JoinColumn({ name: "admin_id", referencedColumnName: "Id" })
  admin: AdminModel;
}