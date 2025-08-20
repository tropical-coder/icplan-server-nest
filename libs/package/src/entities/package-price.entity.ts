import { Entity, Column, ManyToOne, Index, JoinColumn } from "typeorm";
import { BaseModel } from "../BaseModel";
import { PackageModel } from "./PackageModel";
import Stripe from "stripe";

export enum TaxBehavior {
  INCLUSIVE = "inclusive",
  EXCLUSIVE = "exclusive",
  UNSPECIFIED = "unspecified",
}

export enum RecurringInterval {
  Day = "day",
  Week = "week",
  Month = "month",
  Year = "year",
}

@Entity("package_price")
export class PackagePriceModel extends BaseModel {
  @Column({
    name: "package_id",
    type: "bigint",
    nullable: false,
  })
  package_id: number;

  // stripe id of the product
  @Column({
    name: "product",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  product: string;

  @Index({ unique: true })
  @Column({
    name: "stripe_price_id",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  stripe_price_id: string;

  @Column({
    name: "value",
    type: "decimal",
    nullable: false,
  })
  value: number;

  @Column({
    name: "currency",
    type: "varchar",
    length: 3,
    nullable: false,
  })
  currency: string;

  @Column({
    name: "tax_behavior",
    type: "enum",
    enum: TaxBehavior,
    nullable: false,
  })
  tax_behavior: Stripe.Price.TaxBehavior;

  @Column({
    name: "recurring",
    type: "jsonb",
    nullable: false,
  })
  recurring: Stripe.Price.Recurring;

  @Column({
    name: "active",
    type: "boolean",
    default: false,
  })
  active: boolean;

  @ManyToOne(() => PackageModel, (pkg) => pkg.prices, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "package_id" })
  package: PackageModel;
}