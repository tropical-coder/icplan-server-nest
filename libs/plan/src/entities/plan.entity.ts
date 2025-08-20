import {
  Column,
  Entity,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToOne,
  BeforeInsert,
} from "typeorm";
import { BaseModel } from "../BaseModel";
import { BusinessAreaModel } from "../business_area/BusinessAreaModel";
import { TagModel } from "../tag/TagModel";
import { CommunicationModel } from "../communication/CommunicationModel";
import { UserModel } from "../user/UserModel";
import { PlanFilesModel } from "./PlanFilesModel";
import { CurrencyModel } from "../currency/CurrencyModel";
import { StrategicPriorityModel } from "../strategic_priority/StrategicPriorityModel";
import { PlanPermissionModel } from "./PlanPermissionModel";
import { ParentFolderModel } from "../parent_folder/ParentFolderModel";
import { TaskModel } from "../task/TaskModel";
import { PlanTeamModel } from "./PlanTeamModel";
import { PlanOwnerModel } from "./PlanOwnerModel";
import { PhaseModel } from "../phase/PhaseModel";
import { CompanyModel } from "../company/CompanyModel";
import { PlanOnPageModel } from "./PlanOnPageModel";
import { RiskModel } from "../risk/RiskModel";
import { BudgetModel } from "../budget/BudgetModel";
import { CommentModel } from "../comment/CommentModel";

export enum PlanStatus {
  Planned = "planned",
  InProgress = "in_progress",
  Complete = "complete",
  Cancelled = "cancelled",
  Archived = "archived",
  Paused = "paused",
}

export enum RAGBStatus {
  Red = "Red",
  Amber = "Amber",
  Green = "Green",
  Blue = "Blue",
}

@Entity("plan")
export class PlanModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "title",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  title: string;

  @Column({
    name: "owner_id",
    type: "bigint",
    nullable: true,
  })
  owner_id: number;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    name: "start_date",
    type: "date",
    nullable: true,
  })
  start_date: Date;

  @Column({
    name: "end_date",
    type: "date",
    nullable: true,
  })
  end_date: Date;

  @Column({
    name: "budget_planned",
    type: "double precision",
    nullable: true,
  })
  budget_planned: number;

  @Column({
    name: "budget_actual",
    type: "double precision",
    nullable: true,
  })
  budget_actual: number;

  @Column({
    name: "color",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  color: string;

  @Column({
    name: "ongoing",
    type: "boolean",
  })
  ongoing: boolean;

  @Column({
    name: "is_confidential",
    type: "boolean",
    default: false,
  })
  is_confidential: boolean;

  @Column({
    name: "status",
    type: "varchar",
    length: 50,
    default: PlanStatus.InProgress,
  })
  status: PlanStatus;

  @Column({
    name: "currency_id",
    type: "int",
    nullable: true,
  })
  currency_id: number;

  @Column({
    name: "objectives",
    type: "text",
    nullable: true,
  })
  objectives: string;

  @Column({
    name: "key_messages",
    type: "text",
    nullable: true,
  })
  key_messages: string;

  @Column({
    name: "parent_folder_id",
    type: "bigint",
    nullable: true,
    default: 0,
  })
  parent_folder_id: number;

  @Column({
    name: "show_on_calendar",
    type: "boolean",
    default: true,
  })
  show_on_calendar: boolean;

  @Column({
    name: "dashboard_enabled",
    type: "boolean",
    default: false,
  })
  dashboard_enabled: boolean;

  @Column({
    name: "hide_budget",
    type: "boolean",
    nullable: false,
    default: false,
  })
  hide_budget: boolean;

  @Column({
    name: "is_starred",
    type: "boolean",
    default: false,
  })
  is_starred: boolean;

  @Column({
    name: "ragb_status",
    type: "enum",
    enum: RAGBStatus,
    nullable: true,
  })
  ragb_status: RAGBStatus;

  @Column({
    name: "ragb_last_updated",
    type: "timestamp",
    nullable: true,
  })
  ragb_last_updated: Date;

  @BeforeInsert()
  validateStatus() {
    if (!Object.values(PlanStatus).includes(this.status)) {
      throw new Error(`Can not insert record. Invalid plan status: ${this.status}`);
    }
  }

  @OneToMany(
    (type) => CommunicationModel,
    (communicationModel) => communicationModel.plan
  )
  @JoinColumn({ name: "plan_id" })
  communications: CommunicationModel[];

  @ManyToMany((type) => UserModel, {
    cascade: ["insert", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "plan_team",
    joinColumn: { name: "plan_id" },
    inverseJoinColumn: { name: "user_id" },
  })
  team: UserModel[];

  @OneToMany((type) => PlanTeamModel, (planTeamModel) => planTeamModel.plan)
  plan_team: PlanTeamModel[];

  @OneToMany((type) => PlanOwnerModel, (planOwnerModel) => planOwnerModel.plan)
  plan_owner: PlanOwnerModel[];

  @ManyToMany((type) => UserModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "plan_owner",
    joinColumn: { name: "plan_id" },
    inverseJoinColumn: { name: "user_id" },
  })
  owner: UserModel[];

  @ManyToMany((type) => BusinessAreaModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "plan_business_area",
    joinColumn: { name: "plan_id" },
    inverseJoinColumn: { name: "business_area_id" },
  })
  business_areas: BusinessAreaModel[];

  @ManyToMany((type) => TagModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "plan_tag",
    joinColumn: { name: "plan_id" },
    inverseJoinColumn: { name: "tag_id" },
  })
  tags: TagModel[];

  @ManyToMany((type) => StrategicPriorityModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "plan_strategic_priority",
    joinColumn: { name: "plan_id" },
    inverseJoinColumn: { name: "strategic_priority_id" },
  })
  strategic_priorities: StrategicPriorityModel[];

  @ManyToOne((type) => CurrencyModel)
  @JoinColumn({ name: "currency_id" })
  currency: CurrencyModel;

  @ManyToOne((type) => ParentFolderModel)
  @JoinColumn({ name: "parent_folder_id" })
  parent_folder: ParentFolderModel;

  @OneToMany(
    (Type) => PlanFilesModel,
    (planFilesModel) => planFilesModel.plan,
  )
  files: PlanFilesModel[];

  @OneToMany(
    (Type) => PlanPermissionModel,
    (planPermissionModel) => planPermissionModel.plan
  )
  plan_permission: PlanPermissionModel[];

  @OneToMany(
    (type) => TaskModel,
    (taskModel) => taskModel.plan
  )
  tasks: TaskModel[];

  @OneToMany((type) => PhaseModel, (phaseModel) => phaseModel.plan)
  phases: PhaseModel[];

  @ManyToOne((type) => CompanyModel, (company) => company.plan)
  @JoinColumn({ name: "company_id" })
  company: CompanyModel;

  @OneToOne(() => PlanOnPageModel, (planOnPageModel) => planOnPageModel.plan)
  plan_on_page: PlanOnPageModel;

  @OneToMany(() => RiskModel, (riskModel) => riskModel.plan)
  risks: RiskModel[];

  @OneToMany(
    () => BudgetModel,
    (budgetModel) => budgetModel.plan
  )
  budgets: BudgetModel[];

  @OneToMany(
    () => CommentModel,
    (commentModel) => commentModel.plan
  )
  comments: CommentModel[];
}
