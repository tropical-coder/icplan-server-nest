import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserModel } from "@app/user/entities/user.entity";
import { PlanModel } from "./plan.entity";

@Entity("plan_team")
export class PlanTeamModel {
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

  @ManyToOne((type) => PlanModel, (planModel) => planModel.plan_team, {
    cascade: true,
    onDelete: "CASCADE",
  },)
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id" })
  plan: PlanModel;
}
