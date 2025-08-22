import { Column, Entity, OneToOne, JoinColumn, ManyToOne, BaseEntity, PrimaryGeneratedColumn } from 'typeorm';
import { FileModel } from './file.entity';
import { PlanModel } from '@app/plan/entities/plan.entity';

@Entity('plan_files')
export class PlanFilesModel extends BaseEntity {
	@PrimaryGeneratedColumn({
		name: 'Id',
		type: 'bigint'
	})
	Id: number;

	@Column({
		name: 'plan_id',
		type: 'bigint'
	})
	plan_id: number;

	@Column({
		name: 'file_id',
		type: 'bigint'
	})
	file_id: number;

	@OneToOne((type) => FileModel, (fileModel) => fileModel.plan_file, { eager: true })
	@JoinColumn({ name: 'file_id', referencedColumnName: 'Id' })
	file: FileModel;

	@ManyToOne((type) => PlanModel, (planModel) => planModel.files, {
		cascade: [ 'insert', 'update', 'remove' ],
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE'
	})
	@JoinColumn({ name: 'plan_id', referencedColumnName: 'Id' })
	plan: PlanModel;
}
