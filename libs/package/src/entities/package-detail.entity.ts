import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { PackageModel } from "./PackageModel";
import { CreatePackageRequest } from "../../../admin/controller/package/PackageRequest";
import { KeyMessaging } from "../../../admin/controller/subscription/SubscriptionRequest";

@Entity("package_detail")
export class PackageDetailModel extends BaseEntity {
  @PrimaryColumn({
    name: "package_id",
    type: "bigint",
  })
  package_id: number;

  // for enterprise only
  @Column({
    name: "readonly_user_limit",
    type: "int",
    nullable: true,
  })
  readonly_user_limit: number;

  @Column({
    name: "plan_limit",
    type: "int",
    default: 0,
  })
  plan_limit: number;

  @Column({
    name: "communication_limit",
    type: "int",
    default: 0,
  })
  communication_limit: number;

  @Column({
    name: "task_limit",
    type: "int",
    default: 0,
  })
  task_limit: number;

  @Column({
    name: "strategic_priority_limit",
    type: "int",
    default: 0,
  })
  strategic_priority_limit: number;

  @Column({
    name: "business_area_limit",
    type: "int",
    default: 0,
  })
  business_area_limit: number;

  @Column({
    name: "location_limit",
    type: "int",
    default: 0,
  })
  location_limit: number;

  @Column({
    name: "channel_limit",
    type: "int",
    default: 0,
  })
  channel_limit: number;

  @Column({
    name: "audience_limit",
    type: "int",
    default: 0,
  })
  audience_limit: number;

  @Column({
    name: "analytics",
    type: "boolean",
    default: false,
  })
  analytics: boolean;

  @Column({
    name: "advanced_analytics",
    type: "boolean",
    default: false,
  })
  advanced_analytics: boolean;

  @Column({
    name: "reporting",
    type: "boolean",
    default: false,
  })
  reporting: boolean;

  @Column({
    name: "branding",
    type: "boolean",
    default: false,
  })
  branding: boolean;

  @Column({
    name: "subdomain",
    type: "boolean",
    default: false,
  })
  subdomain: boolean;

  @Column({
    name: "sso",
    type: "boolean",
    default: false,
  })
  sso: boolean;

  @Column({
    name: "yammer",
    type: "boolean",
    default: false,
  })
  yammer: boolean;

  @Column({
    name: "teams",
    type: "boolean",
    default: false,
  })
  teams: boolean;

  @Column({
    name: "comment",
    type: "boolean",
    default: false,
  })
  comment: boolean;

  @Column({
    name: "key_messaging",
    type: "enum",
    enum: KeyMessaging,
    default: KeyMessaging.Basic,
    nullable: false,
  })
  key_messaging: KeyMessaging;

  @OneToOne(() => PackageModel, (packageModel) => packageModel.package_detail, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "package_id" })
  package: PackageModel;

  public assignAttributes(data: CreatePackageRequest, packageId?: number) {
    this.package_id = packageId ?? this.package_id;
    this.analytics = data.analytics;
    this.advanced_analytics = data.advanced_analytics;
    this.branding = data.branding;
    this.reporting = data.reporting;
    this.sso = data.sso;
    this.subdomain = data.subdomain;
    this.yammer = data.yammer;
    this.teams = data.teams;
    this.comment = data.comment;
    this.readonly_user_limit = data.readonly_user_limit;
    this.plan_limit = data.plan_limit;
    this.communication_limit = data.communication_limit;
    this.task_limit = data.task_limit;
    this.business_area_limit = data.business_area_limit;
    this.audience_limit = data.audience_limit;
    this.strategic_priority_limit = data.strategic_priority_limit;
    this.location_limit = data.location_limit;
    this.channel_limit = data.channel_limit;
    this.key_messaging = data.key_messaging;
  }
}
