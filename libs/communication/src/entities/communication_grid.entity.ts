import { BaseEntity, Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { CommunicationModel } from "./communication.entity";

export enum GridMainActivity {
  Media = "Media",
  PublicAffairAndGovtRelations = "Public Affairs & Government Relations",
  DigitalAndContent = "Digital & Content",
  MainCommunity = "Main Community/Stakeholder Activity",
  InternalComms = "Internal Comms",
  Marketing = "Marketing",
}

@Entity("communication_grid")
export class CommunicationGridModel extends BaseEntity {
  @PrimaryColumn({
    name: "communication_id",
    type: "bigint",
  })
  communication_id: number;

  @Column({
    name: "show_on_grid",
    type: "boolean",
    default: false,
    nullable: false,
  })
  show_on_grid: boolean;

  @Column({
    name: "main_activity",
    type: "varchar",
    length: 64,
  })
  main_activity: GridMainActivity;

  @OneToOne(() => CommunicationModel, (communication) => communication.communication_grid, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "communication_id", referencedColumnName: "Id" })
  communication: CommunicationModel;
}
