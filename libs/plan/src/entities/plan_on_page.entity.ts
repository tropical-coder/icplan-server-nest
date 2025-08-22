import { BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { PlanModel } from "./plan.entity";

@Entity("plan_on_page")
export class PlanOnPageModel extends BaseEntity {
  @PrimaryColumn({
    name: "plan_id",
    type: "bigint",
  })
  plan_id: number;

  @Column({
    name: "purpose",
    type: "text",
    nullable: true,
  })
  purpose: string;

  @Column({
    name: "audience",
    type: "text",
    nullable: true,
  })
  audience: string;

  @Column({
    name: "objectives",
    type: "text",
    nullable: true,
  })
  objectives: string;

  @Column({
    name: "barriers",
    type: "text",
    nullable: true,
  })
  barriers: string;

  @Column({
    name: "messaging",
    type: "text",
    nullable: true,
  })
  messaging: string;

  @Column({
    name: "how",
    type: "text",
    nullable: true,
  })
  how: string;

  @Column({
    name: "stakeholders",
    type: "text",
    nullable: true,
  })
  stakeholders: string;

  @Column({
    name: "impact",
    type: "text",
    nullable: true,
  })
  impact: string;

  @Column({
    name: "reaction",
    type: "text",
    nullable: true,
  })
  reaction: string;

  @OneToOne(() => PlanModel, (plan) => plan.plan_on_page, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id" })
  plan: PlanModel;
}