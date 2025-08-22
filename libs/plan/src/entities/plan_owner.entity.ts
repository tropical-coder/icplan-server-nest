import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserModel } from "../user/UserModel";
import { PlanModel } from "./PlanModel";

@Entity("plan_owner")
export class PlanOwnerModel {
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

  @ManyToOne((type) => UserModel, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne((type) => PlanModel, (planModel) => planModel.plan_owner, {
    cascade: true,
    onDelete: "CASCADE",
  },)
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id" })
  plan: PlanModel;
}
