import { ColorModel } from "@app/color/entities/color.entity";
import { BaseModel } from "@app/common/base/base.model";
import { OrderDirectionRequest } from "@app/common/base/base.dto";
import { PlanOrderColumnRequest } from "@app/plan/dto/plan.dto";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { UserModel } from "./user.entity";

export enum DefaultTab {
  PlanAndCommunication = 1,
  Calendar = 2,
}

@Entity("user_setting")
export class UserSettingModel extends BaseModel {
  @Column({
    name: "user_id",
    type: "bigint",
    nullable: false,
  })
  user_id: number;

  @Column({
    name: "receive_email_notification",
    type: "boolean",
    default: true,
  })
  receive_email_notification: boolean;

  @Column({
    name: "status_change_notification",
    type: "boolean",
    default: true,
  })
  status_change_notification: boolean;

  @Column({
    name: "assignment_notification",
    type: "boolean",
    default: true,
  })
  assignment_notification: boolean;

  @Column({
    name: "start_date_notification",
    type: "boolean",
    default: true,
  })
  start_date_notification: boolean;

  @Column({
    name: "default_tab",
    type: "smallint",
    default: DefaultTab.PlanAndCommunication,
  })
  default_tab: DefaultTab;

  @Column({
    name: "default_color_id",
    type: "bigint",
    nullable: true,
  })
  default_color_id: number;

  @Column({
    name: "default_sort",
    type: "jsonb",
    default: {
      column: PlanOrderColumnRequest.StartDate,
      direction: OrderDirectionRequest.ASC,
    },
  })
  default_sort: {
    column: PlanOrderColumnRequest;
    direction: OrderDirectionRequest;
  };

  @Column({
    name: "show_phases",
    type: "boolean",
    default: false,
  })
  show_phases: boolean;

  @Column({
    name: "advanced_analytics_layout",
    type: "jsonb",
    nullable: true,
  })
  advanced_analytics_layout: {
    channels: any;
    audiences: any;
    contentTypes: any;
    strategicPriority: any;
    commActivity: any;
    progressTracker: any;
    budget: any;
    riskChart: any;
    highRisk: any;
  };

  @ManyToOne((type) => ColorModel, (colorModel) => colorModel.user_settings, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "default_color_id", referencedColumnName: "Id" })
  color: ColorModel;

  @OneToOne((type) => UserModel, (userModel) => userModel.user_setting, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id", referencedColumnName: "Id" })
  user: UserModel;
}
