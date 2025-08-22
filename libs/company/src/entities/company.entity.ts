import { AudienceModel } from "@app/audience/entities/audience.entity";
import { ChannelModel } from "@app/channel/entities/channel.entity";
import { GetFileKey, GetAWSSignedUrl } from "@app/common/helpers/media.helper";
import { CommunicationModel } from "@app/communication/entities/communication.entity";
import { LocationModel } from "@app/location/entities/location.entity";
import { PlanModel } from "@app/plan/entities/plan.entity";
import { StrategicPriorityModel } from "@app/strategic_priority/entities/strategic-priority.entity";
import { SubscriptionModel } from "@app/subscription/entities/subscription.entity";
import { TaskModel } from "@app/task/entities/task.entity";
import { UserModel } from "@app/user/entities/user.entity";
import { TagModel } from "@app/tag/entities/tag.entity";
import { AfterLoad, Column, Entity, OneToMany, OneToOne } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { ContentTypeModel } from "@app/content_type/entities/content_type.entity";
import { BusinessAreaModel } from "@app/business_area/entities/business_area.entity";
import { KeyMessagesModel } from "@app/key_messages/entities/key_messages.entity";
import { CompanyUserLicenseModel } from "./company_user_license.entity";

export enum SecondaryCalendarView {
  GanttChart = "gantt_chart",
  SwimLane = "swimlane",
}

export enum DefaultCalendarView {
  GanttChart = "gantt_chart",
  SwimLane = "swimlane",
  Calendar = "calendar",
}

export enum DateFormat {
  DMY = "DMY",
  MDY = "MDY",
  YMD = "YMD",
}

export enum CalendarFormat {
  TwelveMonth = 1,
  ThirteenMonth = 2,
}
@Entity("company")
export class CompanyModel extends BaseModel {
  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  name: string;

  @Column({
    name: "image_url",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image_url: string;

  @Column({
    name: "first_day",
    type: "smallint",
    default: 0,
  })
  first_day: number;

  @Column({
    name: "force_week_date",
    type: "boolean",
    default: false,
  })
  force_week_date: boolean;

  @Column({
    name: "first_date",
    type: "smallint",
    nullable: true,
  })
  first_date: number;

  @Column({
    name: "first_month",
    type: "smallint",
    default: 0,
  })
  first_month: number;

  @Column({
    name: "first_week",
    type: "smallint",
    default: 0,
  })
  first_week: number;

  @Column({
    name: "owner_id",
    type: "bigint",
    nullable: true,
  })
  owner_id: number;

  @Column({
    name: "low_color",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  low_color: string;

  @Column({
    name: "high_color",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  high_color: string;

  @Column({
    name: "high_frequency",
    type: "int",
    nullable: true,
  })
  high_frequency: number;

  @Column({
    name: "old_company_id",
    type: "bigint",
    nullable: true,
  })
  old_company_id: number;

  @Column({
    name: "is_mfa_enabled",
    type: "boolean",
    default: "false",
  })
  is_mfa_enabled: boolean;

  @Column({
    name: "secondary_calendar_view",
    type: "varchar",
    length: 100,
    default: SecondaryCalendarView.GanttChart,
  })
  secondary_calendar_view: string;

  @Column({
    name: "default_calendar_view",
    type: "varchar",
    length: 100,
    default: DefaultCalendarView.Calendar,
  })
  default_calendar_view: string;

  @Column({
    name: "show_key_messages",
    type: "boolean",
    default: "false",
  })
  show_key_messages: boolean;

  @Column({
    name: "show_content_type",
    type: "boolean",
    default: "false",
  })
  show_content_type: boolean;

  @Column({
    name: "quickbook_id",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  quickbook_id: string;

  @Column({
    name: "notification_enabled",
    type: "boolean",
    default: false,
  })
  notification_enabled: boolean;

  @Column({
    name: "sso_allowed",
    type: "boolean",
    default: false,
  })
  sso_allowed: boolean;

  @Column({
    name: "notification_before_days",
    type: "int",
    default: 1,
  })
  notification_before_days: number;

  @Column({
    name: "date_format",
    type: "varchar",
    length: 50,
    default: DateFormat.DMY,
  })
  date_format: DateFormat;

  @Column({
    name: "calendar_format",
    type: "smallint",
    default: CalendarFormat.TwelveMonth,
  })
  calendar_format: CalendarFormat;

  @Column({
    name: "grid_enabled",
    type: "boolean",
    default: false,
  })
  grid_enabled: boolean;

  @Column({
    name: "dashboard_enabled",
    type: "boolean",
    default: false,
  })
  dashboard_enabled: boolean;

  @Column({
    name: "country_code",
    type: "char",
    length: 2,
    nullable: true,
  })
  country_code: string;

  @Column({
    name: "deleted_at",
    type: "date",
    nullable: true,
  })
  deleted_at: Date;

  @Column({
    name: "is_active",
    type: "boolean",
    default: true,
  })
  is_active: boolean;

  // Virtual columns
  user_count: number;

  audience_count: number;

  business_area_count: number;

  channel_count: number;

  location_count: number;

  strategic_priority_count: number;

  tag_count: number;

  plan_count: number;

  communication_count: number;

  task_count: number;

  @AfterLoad()
  async signImageUrl() {
    if (this["image_url"]) {
      let key = GetFileKey(this.image_url);
      this.image_url = await GetAWSSignedUrl(key);
    }
  }


  @OneToMany((type) => UserModel, (userModel) => userModel.company)
  user: UserModel;

  @OneToOne(
    (type) => SubscriptionModel,
    (subscriptionModel) => subscriptionModel.company
  )
  subscription: SubscriptionModel;

  // @OneToOne(() => MfaEnabledCompaniesModel, (mfaCompany) => mfaCompany.company)
  // mfa_company: MfaEnabledCompaniesModel;

  // @OneToOne(() => SsoEnabledCompaniesModel, (ssoCompany) => ssoCompany.company)
  // sso_company: SsoEnabledCompaniesModel;

  @OneToMany(
    () => KeyMessagesModel,
    (keyMessagesModel) => keyMessagesModel.company
  )
  key_messages: KeyMessagesModel[];

  @OneToMany((type) => AudienceModel, (audienceModel) => audienceModel.company)
  audience: AudienceModel;

  @OneToMany(
    (type) => ContentTypeModel,
    (contentTypeModel) => contentTypeModel.company
  )
  content_type: ContentTypeModel;

  @OneToMany(
    (type) => BusinessAreaModel,
    (businessAreaModel) => businessAreaModel.company
  )
  businessArea: BusinessAreaModel;

  @OneToMany((type) => ChannelModel, (channelModel) => channelModel.company)
  channel: ChannelModel;

  @OneToMany((type) => LocationModel, (locationModel) => locationModel.company)
  location: LocationModel;

  @OneToMany(
    (type) => StrategicPriorityModel,
    (strategicPriorityModel) => strategicPriorityModel.company
  )
  strategicPriority: StrategicPriorityModel;

  @OneToMany((type) => TagModel, (tagModel) => tagModel.company)
  tag: TagModel;

  @OneToMany(
    (type) => CompanyUserLicenseModel,
    (companyUserLicenseModel) => companyUserLicenseModel.company
  )
  company_user_license: CompanyUserLicenseModel;

  @OneToMany((type) => PlanModel, (planModel) => planModel.company)
  plan: PlanModel;

  @OneToMany((type) => CommunicationModel, (communicationModel) => communicationModel.company)
  communication: CommunicationModel;

  @OneToMany((type) => TaskModel, (taskModel) => taskModel.company)
  task: TaskModel;
}