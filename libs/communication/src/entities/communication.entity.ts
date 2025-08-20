import {
  Column,
  Entity,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  OneToMany,
  RelationCount,
  OneToOne,
  BeforeInsert,
  Index,
} from "typeorm";
import { BaseModel } from "../BaseModel";
import { ChannelModel } from "../channel/ChannelModel";
import { AudienceModel } from "../audience/AudienceModel";
import { LocationModel } from "../location/LocationModel";
import { BusinessAreaModel } from "../business_area/BusinessAreaModel";
import { TagModel } from "../tag/TagModel";
import { PlanModel } from "../plan/PlanModel";
import { UserModel } from "../user/UserModel";
import { TaskModel } from "../task/TaskModel";
import { CommunicationFilesModel } from "./CommunicationFilesModel";
import { CurrencyModel } from "../currency/CurrencyModel";
import { StrategicPriorityModel } from "../strategic_priority/StrategicPriorityModel";
import { CommunicationPermissionModel } from "./CommunicationPermissionModel";
import { CommunicationSocialPostsModel } from "./CommunicationSocialPostsModel";
import { ContentTypeModel } from "../content_type/ContentTypeModel";
import { CommunicationGridModel } from "./CommunicationGridModel";
import { CommunicationTeamModel } from "./CommunicationTeamModel";
import { PhaseModel } from "../phase/PhaseModel";
import { CompanyModel } from "../company/CompanyModel";
import { BudgetModel } from "../budget/BudgetModel";
import { CommentModel } from "../comment/CommentModel";

export enum CommunicationStatus {
  Planned = "planned",
  InProgress = "in_progress",
  Complete = "complete",
  Cancelled = "cancelled",
  Archived = "archived",
  Paused = "paused",
  ChannelAwaitingApproval = "channel_awaiting_approval",
  CopyAwaitingApproval = "copy_awaiting_approval",
  ChannelApproved = "channel_approved",
  CopyApproved = "copy_approved",
  QueryNotApproved = "query_not_approved",
}

export type CommunicationSelectable =
  | "owner"
  | "business_areas"
  | "strategic_priorities"
  | "audiences"
  | "channels"
  | "tag"
  | "location"
  | "content_type"
  | "plan_owner";

@Entity("communication")
export class CommunicationModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "plan_id",
    type: "bigint",
  })
  plan_id: number;

  @Column({
    name: "owner_id",
    type: "bigint",
    nullable: true,
  })
  owner_id: number;

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
    name: "start_time",
    type: "time without time zone",
    nullable: true,
  })
  start_time: string;

  @Column({
    name: "end_time",
    type: "time without time zone",
    nullable: true,
  })
  end_time: string;

  @Column({
    name: "full_day",
    type: "boolean",
    default: false,
  })
  full_day: boolean;

  @Column({
    name: "no_set_time",
    type: "boolean",
    default: false,
  })
  no_set_time: boolean;

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
    default: CommunicationStatus.InProgress,
  })
  status: CommunicationStatus;

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
    name: "task_position",
    type: "jsonb",
    nullable: true,
  })
  task_position: {
    todo: Array<number>;
    in_progress: Array<number>;
    completed: Array<number>;
  };

  @Column({
    name: "show_on_calendar",
    type: "boolean",
    default: true,
  })
  show_on_calendar: boolean;

  @Column({
    name: "rrule",
    type: "varchar",
    length: 512,
    nullable: true,
  })
  rrule: string;

  @Index("idx_communication_parent_id")
  @Column({
    name: "parent_id",
    type: "bigint",
    nullable: true,
  })
  parent_id: number;

  phase: PhaseModel;

  @BeforeInsert()
  validateStatus() {
    if (!Object.values(CommunicationStatus).includes(this.status)) {
      throw new Error(`Can not insert record. Invalid communication status: ${this.status}`);
    }
  }

  @ManyToOne((type) => PlanModel, (planModel) => planModel.communications)
  @JoinColumn({ name: "plan_id" })
  plan: PlanModel;

  @ManyToOne((type) => UserModel)
  @JoinColumn({ name: "owner_id" })
  owner: UserModel;

  @ManyToMany((type) => UserModel, {
    cascade: ["insert", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_team",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "user_id" },
  })
  team: UserModel[];

  @OneToMany(
    (type) => CommunicationTeamModel,
    (commTeamModel) => commTeamModel.communication
  )
  communication_team: CommunicationTeamModel[];

  @ManyToMany((type) => ChannelModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_channel",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "channel_id" },
  })
  channels: ChannelModel[];

  @ManyToMany((type) => AudienceModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_audience",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "audience_id" },
  })
  audiences: AudienceModel[];

  @ManyToMany((type) => ContentTypeModel, {
    eager: true,
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_content_type",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "content_type_id" },
  })
  content_types: ContentTypeModel[];

  @ManyToMany((type) => LocationModel, {
    eager: true,
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_location",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "location_id" },
  })
  locations: LocationModel[];

  @ManyToMany((type) => BusinessAreaModel, {
    eager: true,
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_business_area",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "business_area_id" },
  })
  business_areas: BusinessAreaModel[];

  @ManyToMany((type) => TagModel, {
    eager: true,
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_tag",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "tag_id" },
  })
  tags: TagModel[];

  @ManyToMany((type) => StrategicPriorityModel, {
    cascade: ["insert", "update", "remove"],
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinTable({
    name: "communication_strategic_priority",
    joinColumn: { name: "communication_id" },
    inverseJoinColumn: { name: "strategic_priority_id" },
  })
  strategic_priorities: StrategicPriorityModel[];

  @OneToMany((type) => TaskModel, (taskModel) => taskModel.communication, {
    cascade: ["insert"],
  })
  tasks: TaskModel[];

  @ManyToOne((type) => CurrencyModel)
  @JoinColumn({ name: "currency_id" })
  currency: CurrencyModel;

  @OneToMany(
    (Type) => CommunicationFilesModel,
    (communicationFilesModel) => communicationFilesModel.communication,
    {
      eager: true,
    }
  )
  files: CommunicationFilesModel[];

  @OneToMany(
    (Type) => CommunicationSocialPostsModel,
    (communicationSocialPostsModel) =>
      communicationSocialPostsModel.communication,
    {
      eager: true,
    }
  )
  social_posts: CommunicationSocialPostsModel[];

  @OneToMany(
    (Type) => CommunicationPermissionModel,
    (communicationPermissionModel) => communicationPermissionModel.communication
  )
  communication_permission: CommunicationPermissionModel[];

  @ManyToOne(
    () => CommunicationModel,
    (communication) => communication.recurrings,
    { onDelete: "CASCADE" }
  )
  @JoinColumn({ name: "parent_id" })
  parent: CommunicationModel;

  @OneToMany(() => CommunicationModel, (communication) => communication.parent)
  recurrings: CommunicationModel[];

  @OneToOne(
    () => CommunicationGridModel,
    (communicationGrid) => communicationGrid.communication,
    { cascade: ["insert", "update", "remove"] }
  )
  communication_grid: CommunicationGridModel;

  @ManyToOne(() => CompanyModel, (company) => company.communication)
  @JoinColumn({ name: "company_id" })
  company: CompanyModel;

  @OneToOne(
    () => BudgetModel,
    (budgetModel) => budgetModel.communication,
    {
      eager: true,
      cascade: ["insert"]
    }
  )
  budget: BudgetModel;

  @OneToMany(() => CommentModel, (comment) => comment.communication)
  comments: CommentModel[];
}
