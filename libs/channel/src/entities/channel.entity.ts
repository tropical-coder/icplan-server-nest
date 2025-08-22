import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
} from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { BusinessAreaModel } from "@app/business_area/entities/business_area.entity";
import { CompanyModel } from "@app/company/entities/company.entity";

@Entity("channel")
export class ChannelModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  name: string;

  @Column({
    name: "description",
    type: "varchar",
    length: 500,
    nullable: true,
  })
  description: string;

  @Column({
    name: "is_archive",
    type: "boolean",
    default: false,
  })
  is_archive: boolean;

  @ManyToMany((type) => BusinessAreaModel)
  @JoinTable({
    name: "channel_business_area",
    joinColumn: { name: "channel_id" },
    inverseJoinColumn: { name: "business_area_id" },
  })
  business_areas: BusinessAreaModel[];

  @ManyToOne((type) => CompanyModel, (companyModel) => companyModel.channel)
  @JoinColumn({ name: "company_id", referencedColumnName: "Id" })
  company: CompanyModel;
}
