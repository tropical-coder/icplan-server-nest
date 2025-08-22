import { UserModel } from "@app/user/entities/user.entity";
import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn, Index, BaseEntity } from "typeorm";
import { CommunicationModel } from "./communication.entity";
import { UserPermission } from "@app/business_area/entities/user_business_area_permission.entity";

@Entity("communication_permission")
export class CommunicationPermissionModel extends BaseEntity {
  @PrimaryColumn({
    name: "user_id",
    type: "bigint",
  })
  user_id: number;

  @Index("idx_communication_permission_comm_id") // To speed up recurring deletion
  @PrimaryColumn({
    name: "communication_id",
    type: "bigint",
  })
  communication_id: number;

  @Column({
    name: "permission",
    type: "enum",
    enum: UserPermission,
    default: UserPermission.Read,
  })
  permission: UserPermission;

  @ManyToOne(
    (type) => UserModel,
    (userModel) => userModel.communication_permission,
    {
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne((type) => CommunicationModel, {
    cascade: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "communication_id", referencedColumnName: "Id" })
  communication: CommunicationModel;
}
