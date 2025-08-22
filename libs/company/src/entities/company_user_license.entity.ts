import { Column, Entity, OneToOne, JoinColumn } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { CompanyModel } from "./company.entity";

@Entity("company_user_license")
export class CompanyUserLicenseModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "settings",
    type: "jsonb",
    nullable: true,
  })
  settings: {
    subdomains: Array<string>;
    emails: Array<string>;
  };

  @Column({
    name: "pop_subtitles",
    type: "jsonb",
    nullable: true,
  })
  pop_subtitles: {
    purpose: string;
    audience: string;
    objectives: string;
    barriers: string;
    messaging: string;
    how: string;
    stakeholders: string;
    impact: string;
    reaction: string;
  };

  @OneToOne(
    (type) => CompanyModel,
    (companyModel) => companyModel.company_user_license,
    { eager: true }
  )
  @JoinColumn({ name: "company_id", referencedColumnName: "Id" })
  company: CompanyModel;
}
