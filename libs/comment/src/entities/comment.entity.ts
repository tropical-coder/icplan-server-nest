import { BaseModel } from "@app/common/base/base.model";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { UserModel } from "@app/user/entities/user.entity";
import { PlanModel } from "@app/plan/entities/plan.entity";
import { CommunicationModel } from "@app/communication/entities/communication.entity";

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
