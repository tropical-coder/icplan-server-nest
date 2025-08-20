import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../BaseModel';
import { CompanyModel } from '../company/CompanyModel';

@Entity('strategic_priority')
export class StrategicPriorityModel extends BaseModel {
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

	@ManyToOne((type) => CompanyModel, (companyModel) => companyModel.strategicPriority)
	@JoinColumn({ name: 'company_id', referencedColumnName: 'Id' })
	company: CompanyModel;
}
