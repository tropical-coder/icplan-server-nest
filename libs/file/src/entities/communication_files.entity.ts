import { Column, Entity, OneToOne, JoinColumn, ManyToOne, BaseEntity, PrimaryGeneratedColumn } from 'typeorm';
import { FileModel } from '../file/FileModel';
import { CommunicationModel } from './CommunicationModel';

@Entity('communication_files')
export class CommunicationFilesModel extends BaseEntity {
	@PrimaryGeneratedColumn({
		name: 'Id',
		type: 'bigint'
	})
	Id: number;

	@Column({
		name: 'communication_id',
		type: 'bigint'
	})
	communication_id: number;

	@Column({
		name: 'file_id',
		type: 'bigint'
	})
	file_id: number;

	@OneToOne((type) => FileModel, (fileModel) => fileModel.communication_file, { eager: true })
	@JoinColumn({ name: 'file_id', referencedColumnName: 'Id' })
	file: FileModel;

	@ManyToOne((type) => CommunicationModel, (communicationModel) => communicationModel.files, {
		cascade: [ 'insert', 'update', 'remove' ],
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE'
	})
	@JoinColumn({ name: 'communication_id', referencedColumnName: 'Id' })
	communication: CommunicationModel;
}
