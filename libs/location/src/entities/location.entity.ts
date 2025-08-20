import { Column, Entity, OneToMany, JoinColumn, ManyToOne, RelationCount } from 'typeorm';
import { BaseModel } from '../BaseModel';
import { CompanyModel } from '../company/CompanyModel';

@Entity('location')
export class LocationModel extends BaseModel {
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
		name: 'type',
		type: 'int',
		nullable: true
	})
	type: number;

	@Column({
		name: 'parent_id',
		type: 'bigint',
		nullable: true
	})
	parent_id: number;

	@ManyToOne((type) => LocationModel, (locationModel) => locationModel.sub_location)
	@JoinColumn({ name: 'parent_id' })
	parent: LocationModel;

	@OneToMany((type) => LocationModel, (locationModel) => locationModel.parent, {
		cascade: [ 'insert', 'update', 'remove' ],
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE'
	})
	sub_location: LocationModel[];

	@ManyToOne((type) => CompanyModel, (companyModel) => companyModel.location)
	@JoinColumn({ name: 'company_id', referencedColumnName: 'Id' })
	company: CompanyModel;
}
