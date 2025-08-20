import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseModel } from "../BaseModel";
import { UserModel } from "../user/UserModel";
import { PlanModel } from "../plan/PlanModel";
import { CommunicationModel } from "../communication/CommunicationModel";

@Entity("comment")
export class CommentModel extends BaseModel {
  @Column({
    name: "plan_id",
    type: "bigint",
    nullable: false,
  })
  plan_id: number;

  @Column({
    name: "communication_id",
    type: "bigint",
    nullable: true,
  })
  communication_id: number;

  @Column({
    name: "user_id",
    type: "bigint",
    nullable: false,
  })
  user_id: number;

  @Column({
    name: "company_id",
    type: "bigint",
    nullable: false,
  })
  company_id: number;

  @Column({
    name: "content",
    type: "text",
    nullable: false,
  })
  content: string;

  @Column({
    name: "tagged_users",
    type: "jsonb",
    nullable: false,
    default: () => "'[]'",
  })
  tagged_users: number[];

  @ManyToOne(() => UserModel, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name:"user_id", referencedColumnName: "Id" })
  user: UserModel;

  @ManyToOne(() => PlanModel, (plan) => plan.comments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "plan_id", referencedColumnName: "Id", })
  plan: PlanModel;

  @ManyToOne(() => CommunicationModel, (communication) => communication.comments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "communication_id", referencedColumnName: "Id", })
  communication: CommunicationModel;
}
