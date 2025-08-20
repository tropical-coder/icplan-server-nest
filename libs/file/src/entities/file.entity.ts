import { Column, Entity, OneToOne, JoinColumn } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { PlanFilesModel } from "@app/plan/entities/plan-files.entity";
import { CommunicationFilesModel } from "@app/communication/entities/communication-files.entity";

@Entity("file")
export class FileModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "path",
    type: "text",
  })
  path: string;

  @Column({
    name: "size",
    type: "integer",
    nullable: true,
  })
  size: number;

  @Column({
    name: "mime_type",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  mime_type: string;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  name: string;

  @Column({
    name: "is_aws",
    type: "boolean",
    default: false,
  })
  is_aws: boolean;

  @OneToOne((type) => PlanFilesModel, (planFilesModel) => planFilesModel.file, {
    onDelete: "CASCADE",
  })
  plan_file: PlanFilesModel;

  @OneToOne(
    (type) => CommunicationFilesModel,
    (communicationFilesModel) => communicationFilesModel.file
  )
  communication_file: CommunicationFilesModel;
}
