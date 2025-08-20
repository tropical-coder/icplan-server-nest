import { Column, Entity, OneToOne, OneToMany, Index, AfterLoad } from "typeorm";
import { BaseModel } from "../BaseModel";
import { PackageDetailModel } from "./package-detail.entity";
import { PackagePriceModel } from "./package-price.entity";
import { SubscriptionModel } from "../subscription/SubscriptionModel";
import { CreatePackageRequest } from "../../../admin/controller/package/PackageRequest";
import { GetAWSSignedUrl, GetFileKey } from "../../service/aws/MediaService";

export enum PackageType {
  Normal = "normal",
  Enterprise = "enterprise",
}

@Entity("package")
export class PackageModel extends BaseModel {
  @Column({
    name: "name",
    type: "varchar",
    length: 50,
    nullable: false,
  })
  name: string;

  @Column({
    name: "subtitle",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  subtitle: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    name: "tag",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  tag: string;

  @Column({
    name: "package_type",
    type: "enum",
    enum: PackageType,
    nullable: false,
  })
  package_type: PackageType;

  @Column({
    name: "expiry_in_seconds",
    type: "int",
    default: 604800, // 7 days
    nullable: false,
  })
  expiry_in_seconds: number;

  @Column({
    name: "trial_extension_seconds",
    type: "int",
    default: 604800, // 7 days
    nullable: false,
  })
  trial_extension_seconds: number;

  @Column({
    name: "active",
    type: "boolean",
    default: false,
  })
  active: boolean;

  @Index({ unique: true })
  @Column({
    name: "stripe_product_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  stripe_product_id: string;

  @Column({
    name: "marketing_features",
    type: "jsonb",
    default: '[]',
    nullable: false,
  })
  marketing_features: string[];

  @Column({
    name: "icon",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  icon: string;

  @Column({
    name: "is_beta",
    type: "boolean",
    default: false,
    nullable: false,
  })
  is_beta: boolean;

  @Column({
    name: "is_highlighted",
    type: "boolean",
    default: false,
    nullable: false,
  })
  is_highlighted: boolean;

  @Column({
    name: "is_default",
    type: "boolean",
    default: false,
    nullable: false,
  })
  is_default: boolean;

  @OneToOne(() => PackageDetailModel, (packageDetail) => packageDetail.package)
  package_detail: PackageDetailModel;

  @OneToMany(() => PackagePriceModel, (packagePrice) => packagePrice.package)
  prices: PackagePriceModel[];

  @OneToMany(() => SubscriptionModel, (subscription) => subscription.package)
  subscriptions: SubscriptionModel[];

  @AfterLoad()
  async signIconUrl() {
    if (this["icon"]) {
      let key = GetFileKey(this.icon);
      this.icon = await GetAWSSignedUrl(key);
    }
  }

  public assignAttributes(data: CreatePackageRequest, adminId?: number, stripeProductId?: string) {
    this.name = data.name;
    this.subtitle = data.subtitle;
    this.description = data.description;
    this.tag = data.tag;
    this.active = data.active;
    this.expiry_in_seconds = data.expiry_in_seconds ?? 604800; // 7 days
    this.trial_extension_seconds = data.trial_extension_seconds ?? 604800;
    this.created_by = adminId ?? this.created_by;
    this.package_type = this.package_type ?? PackageType.Normal;
    this.stripe_product_id = stripeProductId ?? this.stripe_product_id;
    this.marketing_features = data.marketing_features;
    this.is_beta = data.is_beta;
    this.is_highlighted = data.is_highlighted;
    this.is_default = data.is_default;
  }
}
