import { Column, Entity, Index } from "typeorm";
import { BaseModel } from "../BaseModel";

@Entity("style")
export class StyleModel extends BaseModel {
  @Index({ unique: true })
  @Column({
    name: "subdomain",
    type: "varchar",
    length: 50,
  })
  subdomain: string;

  @Column({
    name: "css",
    type: "text",
  })
  css: string;
}