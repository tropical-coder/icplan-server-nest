import { Column, Entity } from "typeorm";
import { BaseModel } from "../BaseModel";

@Entity("mfa_secret")
export class MfaSecretModel extends BaseModel {
  @Column({
    name: "secret",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  secret: string;
}
