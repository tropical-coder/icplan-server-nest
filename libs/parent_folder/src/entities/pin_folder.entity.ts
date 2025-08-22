import { BaseEntity, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserModel } from "@app/user/entities/user.entity";
import { ParentFolderModel } from "./parent_folder.entity";

@Entity("pin_folder")
export class PinFolderModel extends BaseEntity {
  @PrimaryColumn({
    name: "parent_folder_id",
    type: "bigint",
    nullable: false,
  })
  parent_folder_id: number;

  @PrimaryColumn({
    name: "user_id",
    type: "bigint",
    nullable: false,
  })
  user_id: number;

  @ManyToOne((type) => UserModel, (userModel) => userModel.pin_folder, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne(
    (type) => ParentFolderModel,
    (parentFolderModel) => parentFolderModel.pin_folder,
    {
      cascade: true,
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "parent_folder_id", referencedColumnName: "Id" })
  parent_folder: ParentFolderModel;
}
