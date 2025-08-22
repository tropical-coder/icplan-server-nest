import { BaseEntity, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserModel } from "@app/user/entities/user.entity";
import { CommunicationModel } from "./communication.entity";

@Entity("communication_team")
export class CommunicationTeamModel extends BaseEntity {
  @PrimaryColumn({
    name: "user_id",
    type: "bigint",
  })
  user_id: number;

  @PrimaryColumn({
    name: "communication_id",
    type: "bigint",
  })
  communication_id: number;

  @ManyToOne((type) => UserModel, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne((type) => CommunicationModel, (communicationModel) => communicationModel.communication_team, {
    cascade: true,
    onDelete: "CASCADE",
  },)
  @JoinColumn({ name: "communication_id", referencedColumnName: "Id" })
  communication: CommunicationModel;
}
