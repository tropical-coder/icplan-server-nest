import { BaseModel } from "@app/common/base/base.model";
import { UserModel } from "@app/user/entities/user.entity";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BusinessAreaModel } from "./business_area.entity";

export enum UserPermission {
  Read = "read",
  Edit = "edit",
}

@Entity("user_business_area_permission")
export class UserBusinessAreaPermissionModel extends BaseModel {
  @Column({
    name: "user_id",
    type: "bigint",
  })
  user_id: number;

  @Column({
    name: "business_area_id",
    type: "bigint",
  })
  business_area_id: number;

  @Column({
    name: "permission",
    type: "enum",
    enum: UserPermission,
    default: UserPermission.Read,
  })
  permission: UserPermission;

  @Column({
    name: "is_primary",
    type: "boolean",
    nullable: false,
    default: false,
  })
  is_primary: boolean;

  @ManyToOne(
    (type) => UserModel,
    (userModel) => userModel.business_area_permission,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne((type) => BusinessAreaModel, {
    eager: true,
    cascade: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "business_area_id", referencedColumnName: "Id" })
  business_area: BusinessAreaModel;
}
