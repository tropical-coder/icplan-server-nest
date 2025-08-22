import { BaseModel } from '@app/common/base/base.model';
import { Column, Entity, OneToMany, JoinColumn, ManyToMany, JoinTable, ManyToOne, RelationCount } from 'typeorm';
import { UserBusinessAreaPermissionModel } from './user_business_area_permission.entity';
import { ChannelModel } from '@app/channel/entities/channel.entity';
import { AudienceModel } from '@app/audience/entities/audience.entity';
import { CompanyModel } from '@app/company/entities/company.entity';


@Entity('business_area')
export class BusinessAreaModel extends BaseModel {
	@Column({
		name: 'company_id',
		type: 'bigint'
	})
	company_id: number;

	@Column({
		name: 'name',
		type: 'varchar',
		length: 255,
		nullable: true
	})
	name: string;

	@Column({
		name: 'parent_id',
		type: 'bigint',
		nullable: true
	})
	parent_id: number;

	@ManyToOne((type) => BusinessAreaModel, (businessAreaModel) => businessAreaModel.sub_business_area)
	@JoinColumn({ name: 'parent_id' })
	parent: BusinessAreaModel;

	@OneToMany((type) => BusinessAreaModel, (businessAreaModel) => businessAreaModel.parent)
	sub_business_area: BusinessAreaModel[];

	@ManyToMany((type) => AudienceModel)
	@JoinTable({
		name: 'audience_business_area',
		joinColumn: { name: 'business_area_id' },
		inverseJoinColumn: { name: 'audience_id' }
	})
	audience: AudienceModel[];

	@ManyToMany((type) => ChannelModel)
	@JoinTable({
		name: 'channel_business_area',
		joinColumn: { name: 'business_area_id' },
		inverseJoinColumn: { name: 'channel_id' }
	})
	channels: ChannelModel[];

	@OneToMany(
		(type) => UserBusinessAreaPermissionModel,
		(userBusinessAreaPermissionModel) => userBusinessAreaPermissionModel.business_area
	)
	business_area_permission: UserBusinessAreaPermissionModel[];

	@ManyToOne((type) => CompanyModel, (companyModel) => companyModel.businessArea)
	@JoinColumn({ name: 'company_id', referencedColumnName: 'Id' })
	company: CompanyModel;
}
