import { Column, Entity, OneToMany, JoinColumn, ManyToMany, JoinTable, ManyToOne, RelationCount } from 'typeorm';
import { BaseModel } from '../BaseModel';
import { AudienceModel } from '../audience/AudienceModel';
import { ChannelModel } from '../channel/ChannelModel';
import { UserBusinessAreaPermissionModel } from '../user/business_area_permission/UserBusinessAreaPermissionModel';
import { CompanyModel } from '../company/CompanyModel';

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
