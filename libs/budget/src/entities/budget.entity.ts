import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { BaseModel } from "../BaseModel";
import { PlanModel } from "../plan/PlanModel";
import { CommunicationModel } from "../communication/CommunicationModel";

@Entity("budget")
export class BudgetModel extends BaseModel {
  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    nullable: true
  })
  name: string;

  @Column({
    name: "planned",
    type: "double precision",
    nullable: false
  })
  planned: number;

  @Column({
    name: "actual",
    type: "double precision",
    nullable: true
  })
  actual: number;

  @Column({
    name: "plan_id",
    type: "bigint",
    nullable: false
  })
  plan_id: number;

  @Column({
    name: "communication_id",
    type: "bigint",
    nullable: true
  })
  communication_id: number;

  @Column({
    name: "company_id",
    type: "bigint",
    nullable: false
  })
  company_id: number;

  @ManyToOne(() => PlanModel, plan => plan.budgets)
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id" })
  plan: PlanModel;

  @OneToOne(() => CommunicationModel, communication => communication.budget)
  @JoinColumn({ name: "communication_id", referencedColumnName: "Id" })
  communication: CommunicationModel;
}
