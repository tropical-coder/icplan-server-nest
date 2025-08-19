import { Column, Entity, OneToMany } from "typeorm";
import { AdminActivityLogModel } from "./admin-activity-log.entity";
import { BaseModel } from "@app/common/base/base.model";

export enum AdminRole {
  SuperAdmin = 10,
  Admin = 20,
}

@Entity("admin")
export class AdminModel extends BaseModel {
  @Column({
    name: "full_name",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  full_name: string;

  @Column({
    name: "country_code",
    type: "varchar",
    length: 5,
    nullable: false,
  })
  country_code: string;

  @Column({
    name: "phone_number",
    type: "varchar",
    length: 20,
    nullable: false,
  })
  phone_number: string;

  @Column({
    name: "email",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  email: string;

  @Column({
    name: "password",
    type: "varchar",
    length: 128,
    nullable: false,
    select: false,
  })
  password?: string;

  @Column({
    name: "is_active",
    type: "boolean",
    default: false,
  })
  is_active: boolean;

  @Column({
    name: "role",
    type: "smallint",
    default: AdminRole.Admin,
  })
  role: AdminRole;

  @OneToMany(
    () => AdminActivityLogModel,
    (adminActivityLogModel) => adminActivityLogModel.admin
  )
  activity_log: AdminActivityLogModel[];
}

export interface IRedisAdminModel {
  Id: number;
  role: AdminRole;
}
