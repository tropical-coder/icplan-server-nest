import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { UserModel } from "../user/UserModel";

export enum GridMediaLocations {
  Scotland = "Scotland",
  Eastern = "Eastern",
  NorthwestAndCentral = "Northwest & Central",
  WalesAndWestern = "Wales & Western",
  Southern = "Southern",
}

@Entity("grid_media_contact")
export class GridMediaContactModel extends BaseModel {
  @Column({
    name: "user_id",
    type: "bigint",
    nullable: false,
  })
  user_id: number;

  @Column({
    name: "telephone",
    type: "varchar",
    length: 31,
    nullable: true,
  })
  telephone: string;

  @Column({
    name: "location",
    type: "varchar",
    length: 64,
    nullable: false,
  })
  location: GridMediaLocations;

  @Column({
    name: "company_id",
    type: "bigint",
    nullable: false,
  })
  company_id: number;

  @ManyToOne(() => UserModel)
  @JoinColumn({ name: "user_id" })
  user: UserModel;
}
