import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { CompanyModel } from "@app/company/entities/company.entity";

@Entity("content_type")
export class ContentTypeModel extends BaseModel {
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

  @ManyToOne(() => CompanyModel, (company) => company.content_type)
  @JoinColumn({ name: "company_id", referencedColumnName: "Id" })
  company: CompanyModel;
}
