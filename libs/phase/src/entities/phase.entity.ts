import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseModel } from "../BaseModel";
import { PlanModel } from "../plan/PlanModel";
import { UserModel } from "../user/UserModel";

export enum PhaseStatus {
  Planned = "planned",
  InProgress = "in_progress",
  Complete = "complete",
}

@Entity("phase")
export class PhaseModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "title",
    type: "varchar",
    length: 255,
  })
  title: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    name: "status",
    type: "enum",
    enum: PhaseStatus,
  })
  status: PhaseStatus;

  @Column({
    name: "start_date",
    type: "date",
  })
  start_date: Date;

  @Column({
    name: "end_date",
    type: "date",
  })
  end_date: Date;

  @Column({
    name: "plan_id",
    type: "bigint",
  })
  plan_id: number;

  @Column({
    name: "owner_id",
    type: "bigint",
  })
  owner_id: number;

  @ManyToOne(() => PlanModel, (plan) => plan.phases, { onDelete: "CASCADE" })
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id" })
  plan: PlanModel;

  @ManyToOne(() => UserModel, (user) => user.phases)
  @JoinColumn({ name: "owner_id", referencedColumnName: "Id"})
  owner: UserModel;
}
