import { UserPermission } from "@app/business_area/entities/user_business_area_permission.entity";
import { UserModel } from "@app/user/entities/user.entity";
import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn, BaseEntity } from "typeorm";
import { PlanModel } from "./plan.entity";


@Entity("plan_permission")
export class PlanPermissionModel extends BaseEntity {
  @PrimaryColumn({
    name: "user_id",
    type: "bigint",
  })
  user_id: number;

  @PrimaryColumn({
    name: "plan_id",
    type: "bigint",
  })
  plan_id: number;

  @Column({
    name: "permission",
    type: "enum",
    enum: UserPermission,
    default: UserPermission.Read,
  })
  permission: UserPermission;

  @ManyToOne((type) => UserModel, (userModel) => userModel.plan_permission, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne((type) => PlanModel, {
    cascade: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id" })
  plan: PlanModel;
}
