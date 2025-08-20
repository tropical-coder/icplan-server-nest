import { Column, Entity, OneToMany, JoinColumn, ManyToOne, AfterLoad } from "typeorm";
import { BaseModel } from "../BaseModel";
import { PlanModel } from "../plan/PlanModel";
import { PinFolderModel } from "./PinFolderModel";

@Entity("parent_folder")
export class ParentFolderModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    name: "description",
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    name: "parent_folder_id",
    type: "bigint",
    default: null,
    nullable: true,
  })
  parent_folder_id: number;

  @OneToMany((type) => PlanModel, (planModel) => planModel.parent_folder)
  @JoinColumn({ name: "parent_folder_id" })
  plans: PlanModel[];

  @ManyToOne(
    (type) => ParentFolderModel,
    (parentFolderModel) => parentFolderModel.sub_folder
  )
  @JoinColumn({ name: "parent_folder_id" })
  parent_folder: ParentFolderModel;

  @OneToMany(
    (type) => ParentFolderModel,
    (parentFolderModel) => parentFolderModel.parent_folder
  )
  sub_folder: ParentFolderModel[];

  @OneToMany(
    (type) => PinFolderModel,
    (pinFolderModel) => pinFolderModel.parent_folder
  )
  pin_folder: PinFolderModel[];
}
