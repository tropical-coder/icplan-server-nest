import { Column, Entity, OneToOne, ManyToOne, JoinColumn, } from 'typeorm';
import Stripe from 'stripe';
import { BaseModel } from '@app/common/base/base.model';
import { Features } from '../dto/subscription.dto';
import { CompanyModel } from '@app/company/entities/company.entity';
import { PackagePriceModel } from '@app/package/entities/package-price.entity';
import { PackageModel } from '@app/package/entities/package.entity';

export enum SubscriptionStatus {
	Active = 'active',
	Trial = 'trialing',
	Canceled = 'canceled',
	Incomplete = 'incomplete',
	IncompleteExpired = 'incomplete_expired',
	PastDue = 'past_due',
	Paused = 'paused',
	Unpaid = 'unpaid',
}

@Entity('subscription')
export class SubscriptionModel extends BaseModel {
	@Column({
		name: 'company_id',
		type: 'bigint',
		nullable: false
	})
	company_id: number;

	@Column({
		name: 'stripe_subscription_id',
		type: 'varchar',
		length: 255,
		nullable: true
	})
	stripe_subscription_id: string;

	@Column({
		name: 'stripe_customer_id',
		type: 'varchar',
		length: 255,
		nullable: true
	})
	stripe_customer_id: string;

	@Column({
		name: 'package_id',
		type: 'bigint',
	})
	package_id: number;

	// null for enterprise
	@Column({
		name: 'price_id',
		type: 'bigint',
		nullable: true,
	})
	price_id: number;

	@Column({
		name: 'features',
		type: 'jsonb',
		nullable: false,
	})
	features: Features;

	// For free trials
	@Column({
		name: 'valid_till',
		type: 'timestamp',
		nullable: true,
	})
	valid_till: Date;

	// For free trials
	@Column({
		name: 'is_trial_extended',
		type: 'boolean',
		nullable: true,
	})
	is_trial_extended: boolean;

	@Column({
		name: 'status',
		type: 'enum',
		enum: SubscriptionStatus,
		nullable: false,
		default: SubscriptionStatus.Active,
	})
	status: Stripe.Subscription.Status;

	@Column({
		name: 'cancel_at',
		type: 'timestamp',
		nullable: true,
	})
	cancel_at: Date;

	@Column({
		name: 'promo_code',
		type: 'varchar',
		length: 50,
		nullable: true,
	})
	promo_code: string;

	@ManyToOne((type) => PackageModel, (packageModel) => packageModel.subscriptions)
	@JoinColumn({ name: 'package_id', referencedColumnName: 'Id' })
	package?: PackageModel;

	@ManyToOne((type) => PackagePriceModel)
	@JoinColumn({ name: 'price_id', referencedColumnName: 'Id' })
	package_price?: PackagePriceModel;

	@OneToOne((type) => CompanyModel, (companyModel) => companyModel.subscription, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'company_id', referencedColumnName: 'Id' })
	company?: CompanyModel;
}
