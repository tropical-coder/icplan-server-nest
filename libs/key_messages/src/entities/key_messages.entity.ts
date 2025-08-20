import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { CompanyModel } from "@app/company/entities/company.entity";

export enum KeyMessaging {
  Basic = "basic",
  Advanced = "advanced",
}


@Entity("key_messages")
export class KeyMessagesModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "int",
    nullable: false,
  })
  company_id: number;

  @Column({
    name: "key_messages",
    type: "text",
    nullable: false,
  })
  key_messages: string;

  @Column({
    name: "date",
    type: "date",
    nullable: true,
  })
  date: Date;

  @ManyToOne(() => CompanyModel, (company) => company.key_messages)
  @JoinColumn({ name: "company_id", referencedColumnName: "Id" })
  company: CompanyModel;
}
