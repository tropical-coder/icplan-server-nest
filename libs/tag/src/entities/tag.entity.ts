import { BaseModel } from '@app/common/base/base.model';
import { CompanyModel } from '@app/company/entities/company.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

@Entity('tag')
export class TagModel extends BaseModel {
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

	@ManyToOne((type) => CompanyModel, (companyModel) => companyModel.tag)
	@JoinColumn({ name: 'company_id', referencedColumnName: 'Id' })
	company: CompanyModel;
}
