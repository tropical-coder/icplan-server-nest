import {
  Column,
  Entity,
  OneToOne,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from "typeorm";
import { BaseModel } from "../BaseModel";
import { CommunicationModel } from "../communication/CommunicationModel";
import { UserModel } from "../user/UserModel";
import { TagModel } from "../tag/TagModel";
import { PlanModel } from "../plan/PlanModel";
import { PhaseModel } from "../phase/PhaseModel";
import { CompanyModel } from "../company/CompanyModel";

export enum TaskStatus {
  Completed = "completed",
  InProgress = "in_progress",
  Todo = "todo",
  Archived = "archived",
}

@Entity("task")
export class TaskModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  name: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    name: "communication_id",
    type: "bigint",
    nullable: true,
  })
  communication_id: number;

  @Column({
    name: "plan_id",
    type: "bigint",
    nullable: true,
  })
  plan_id: number;

  @Column({
    name: "assigned_to",
    type: "bigint",
  })
  assigned_to: number;

  @Column({
    name: "due_date",
    type: "date",
    nullable: true,
  })
  due_date: Date;

  @Column({
    name: "status",
    type: "enum",
    enum: TaskStatus,
    default: TaskStatus.InProgress,
  })
  status: TaskStatus;

  @Column({
    name: "rrule",
    type: "varchar",
    length: 512,
    nullable: true,
  })
  rrule: string;

  @Column({
    name: "parent_id",
    type: "bigint",
    nullable: true,
  })
  parent_id: number;

  phase: PhaseModel;

  @ManyToOne(
    (type) => CommunicationModel,
    (communicationModel) => communicationModel.tasks,
    {
      cascade: true,
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "communication_id" })
  communication: CommunicationModel;

  @ManyToOne(
    (type) => PlanModel,
    (planModel) => planModel.tasks,
    {
      cascade: true,
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "plan_id" })
  plan: PlanModel;

  @ManyToOne((type) => UserModel)
  @JoinColumn({ name: "assigned_to" })
  user: UserModel;

  @ManyToMany((type) => TagModel, {
    cascade: true,
    onDelete: "CASCADE",
  })
  @JoinTable({
    name: "task_tag",
    joinColumn: { name: "task_id" },
    inverseJoinColumn: { name: "tag_id" },
  })
  tags: TagModel[];

  @ManyToOne(
    () => TaskModel,
    (task) => task.recurrings,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "parent_id", referencedColumnName: "Id"})
  parent: TaskModel;

  @OneToMany(() => TaskModel, (task) => task.parent)
  recurrings: TaskModel[];

  @ManyToOne(() => CompanyModel, (company) => company.task)
  @JoinColumn({ name: "company_id" })
  company: CompanyModel;
}
