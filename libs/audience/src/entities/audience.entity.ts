import { Column, Entity, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { BaseModel } from '../BaseModel';
import { BusinessAreaModel } from '../business_area/BusinessAreaModel';
import { CompanyModel } from '../company/CompanyModel';

@Entity('audience')
export class AudienceModel extends BaseModel {
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

	@ManyToMany((type) => BusinessAreaModel, {
		cascade: true,
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE'
	})
	@JoinTable({
		name: 'audience_business_area',
		joinColumn: { name: 'audience_id' },
		inverseJoinColumn: { name: 'business_area_id' }
	})
	business_areas: BusinessAreaModel[];

	@ManyToOne((type) => CompanyModel, (companyModel) => companyModel.audience)
	@JoinColumn({ name: 'company_id', referencedColumnName: 'Id' })
	company: CompanyModel;
}
