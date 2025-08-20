import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseModel } from "../BaseModel";
import { UserModel } from "../user/UserModel";
import { PlanModel } from "../plan/PlanModel";

export enum RiskStatus {
  UnderAssessment = "under_assessment",
  MitigationInProgress = "mitigation_in_progress",
  ContingencyPlanInPlace = "contingency_plan_in_place",
  Accepted = "accepted",
  Escalated = "escalated",
  Resolved = "resolved",
  Closed = "closed",
  Deferred = "deferred",
  Materialized = "materialized",
}

@Entity("risk")
export class RiskModel extends BaseModel {
  @Column({
    name: "plan_id",
    type: "bigint",
    nullable: false,
  })
  plan_id: number;

  @Column({
    name: "company_id",
    type: "bigint",
    nullable: false,
  })
  company_id: number;

  @Column({
    name: "risk_number",
    type: "varchar",
    length: 32,
    nullable: false,
  })
  risk_number: string;

  @Column({
    name: "title",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  title: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    name: "owner_id",
    type: "bigint",
    nullable: false,
  })
  owner_id: number;

  @Column({
    name: "impact",
    type: "smallint",
    nullable: false,
  })
  impact: number;

  @Column({
    name: "likelihood",
    type: "smallint",
    nullable: false,
  })
  likelihood: number;

  @Column({
    name: "mitigation",
    type: "text",
    nullable: true,
  })
  mitigation: string;

  @Column({
    name: "status",
    type: "enum",
    enum: RiskStatus,
    nullable: false,
  })
  status: RiskStatus;

  @ManyToOne(() => UserModel)
  @JoinColumn({ name: "owner_id", referencedColumnName: "Id"})
  owner: UserModel;

  @ManyToOne(() => PlanModel, (plan) => plan.risks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id"})
  plan: PlanModel;
}