import { Column, Entity, OneToMany, Unique } from "typeorm";
import { BaseModel } from "@app/common/base/base.model";
import { UserSettingModel } from "@app/user/entities/user_setting.entity";

@Entity("color")
@Unique(["company_id", "color"])
export class ColorModel extends BaseModel {
  @Column({
    name: "company_id",
    type: "bigint",
  })
  company_id: number;

  @Column({
    name: "color",
    type: "varchar",
    length: 255,
    nullable: false,
  })
  color: string;

  @Column({
    name: "label",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  label: string;

  @OneToMany(
    (type) => UserSettingModel, 
    (userSetting) => userSetting.default_color_id
  )
  user_settings: UserSettingModel[];
}
