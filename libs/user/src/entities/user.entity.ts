import {
  Column,
  Entity,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToOne,
  AfterLoad,
} from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { CompanyModel } from "@app/company/entities/company.entity";
import { LocationModel } from "@app/location/entities/location.entity";
import { UserBusinessAreaPermissionModel } from "@app/business_area/entities/user_business_area_permission.entity";
import { PlanPermissionModel } from "@app/plan/entities/plan_permission.entity";
import { CommunicationPermissionModel } from "@app/communication/entities/communication.entity";
import { SocialIntegrationModel } from "@app/social_integration/entities/social_integration.entity";
import { NotificationModel } from "@app/notification/entities/notification.entity";
import { UserSettingModel } from "./user_setting.entity";

export enum UserRoles {
  Owner = "owner",
  Admin = "admin",
  Manager = "manager",
  User = "user",
  ReadonlyUser = "readonly_user",
}

export interface IRedisUserModel {
  Id: number;
  company_id: number;
  token: string;
  role: UserRoles;
}

@Entity("user")
export class UserModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "full_name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  full_name: string;

  @Column({
    name: "email",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  email: string;

  @Column({
    name: "password",
    type: "varchar",
    length: 255,
    nullable: true,
    select: false,
  })
  password: string;

  @Column({
    name: "salt",
    type: "varchar",
    length: 500,
    nullable: true,
    select: false,
  })
  salt: string;

  @Column({
    name: "image_url",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  image_url: string;

  @Column({
    name: "activated",
    type: "boolean",
    default: false,
  })
  activated: boolean;

  @Column({
    name: "t_and_c_accepted",
    type: "boolean",
    default: false,
    select: false,
  })
  t_and_c_accepted: boolean;

  @Column({
    name: "role",
    type: "enum",
    enum: UserRoles,
    default: UserRoles.User,
  })
  role: UserRoles;

  @Column({
    name: "signup_date",
    type: "bigint",
    nullable: true,
    select: false,
  })
  signup_date: number;

  @Column({
    name: "user_ip",
    type: "varchar",
    nullable: true,
    select: false,
  })
  user_ip: string;

  @Column({
    name: "last_login",
    type: "bigint",
    nullable: true,
    select: false,
  })
  last_login: number;

  @Column({
    name: "is_mfa_enabled",
    type: "boolean",
    default: "false",
    select: false,
  })
  is_mfa_enabled: boolean;

  @Column({
    name: "mfa_secret_id",
    type: "varchar",
    nullable: true,
    select: false,
  })
  mfa_secret_id: boolean;

  @Column({
    name: "tooltip",
    type: "jsonb",
    default: {},
  })
  tooltip: {
    planAndCommunication: Boolean;
    analytics: Boolean;
    calendar: Boolean;
    report: Boolean;
    task: Boolean;
  };

  @Column({
    name: "filters",
    type: "jsonb",
    default: {},
  })
  filters: {
    planAndCommunication: Object;
    analytics: Object;
    calendar: Object;
    report: Object;
    task: Object;
  };

  @Column({
    name: "key_messages_read",
    type: "boolean",
    default: true,
  })
  key_messages_read: boolean;

  @Column({
    name: "ac_contact_id",
    type: "int",
    nullable: true,
  })
  ac_contact_id: number;

  @AfterLoad()
  async signImageUrl() {
    if (this["image_url"]) {
      let key = GetFileKey(this.image_url);
      this.image_url = await GetAWSSignedUrl(key);
    }
  }

  @OneToOne(() => MfaSecretModel)
  @JoinColumn({ name: "mfa_secret_id", referencedColumnName: "Id" })
  mfa_secret: MfaSecretModel;

  @ManyToOne((type) => CompanyModel, (companyModel) => companyModel.user)
  @JoinColumn({ name: "company_id", referencedColumnName: "Id" })
  company: CompanyModel;

  @OneToMany(
    (type) => UserBusinessAreaPermissionModel,
    (userBusinessAreaPermissionModel) => userBusinessAreaPermissionModel.user
  )
  business_area_permission: UserBusinessAreaPermissionModel[];

  @OneToMany(
    (type) => PlanPermissionModel,
    (planPermissionModel) => planPermissionModel.user
  )
  plan_permission: PlanPermissionModel[];

  @OneToMany(
    (type) => CommunicationPermissionModel,
    (communicationPermissionModel) => communicationPermissionModel.user
  )
  communication_permission: CommunicationPermissionModel[];

  @ManyToMany((type) => LocationModel)
  @JoinTable({
    name: "user_location",
    joinColumn: { name: "user_id" },
    inverseJoinColumn: { name: "location_id" },
  })
  locations: LocationModel[];

  // @OneToMany(
  //   (type) => SocialIntegrationModel,
  //   (socialIntegrationModel) => socialIntegrationModel.user
  // )
  // social_integration: SocialIntegrationModel;

  @OneToMany(
    (type) => NotificationModel,
    (notificationModel) => notificationModel.user
  )
  notification: NotificationModel[];

  @OneToOne((type) => UserSettingModel, (userSettingModel) => userSettingModel.user, { 
    cascade: ["insert"], 
    eager: true 
  })
  user_setting: UserSettingModel;

  @OneToMany(
    (type) => PinFolderModel,
    (pinFolderModel) => pinFolderModel.user
  )
  pin_folder: PinFolderModel[];

  @OneToMany(
    (type) => SavedFilterModel,
    (savedFilterModel) => savedFilterModel.user
  )
  saved_filters: SavedFilterModel[];

  @OneToOne((type) => PinnedSavedFilterModel, (pinnedSavedFilterModel) => pinnedSavedFilterModel.user)
  pinned_saved_filter: PinnedSavedFilterModel;

  @OneToMany((type) => PhaseModel, (phaseModel) => phaseModel.owner)
  phases: PhaseModel[];

  @OneToMany(
    (type) => NotificationModel,
    (notificationModel) => notificationModel.user
  )
  notification_rules: NotificationRuleModel[];

  @OneToMany(
    (type) => UserActivityLogModel,
    (userActivityLogModel) => userActivityLogModel.user
  )
  activity_log: UserActivityLogModel[];
}
