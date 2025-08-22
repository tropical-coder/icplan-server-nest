import { IsValidDate } from "../../../app/decorator/DateValidator";
import { IsOptional, IsEnum, IsArray } from "class-validator";
import { CommunicationStatus } from "../../../app/model/communication/CommunicationModel";

export class GetGanttChartRequest {
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: string;

  @IsValidDate({
    message: "end date is invalid",
  })
  end_date: string;

  @IsOptional()
  @IsArray()
  plan_id: number[];

  @IsOptional()
  @IsArray()
  owner: number[];

  @IsOptional()
  @IsEnum(CommunicationStatus, { each: true })
  status: CommunicationStatus[];

  @IsOptional()
  @IsArray()
  tag: number[];

  @IsOptional()
  @IsArray()
  strategic_priority: number[];

  @IsOptional()
  @IsArray()
  team: number[];

  @IsOptional()
  @IsArray()
  location: number[];

  @IsOptional()
  @IsArray()
  audience: number[];

  @IsOptional()
  @IsArray()
  channel: number[];

  @IsOptional()
  @IsArray()
  business_area: number[];

  @IsOptional()
  @IsArray()
  parent_folder_id: number[];

  @IsOptional()
  @IsArray()
  content_type: number[];
}

export class GetGanttChartTaskByCommunicationRequest {
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: string;

  @IsValidDate({
    message: "end date is invalid",
  })
  end_date: string;

  @IsOptional()
  @IsArray()
  plan_id: number[];

  @IsOptional()
  @IsArray()
  owner: number[];

  @IsOptional()
  @IsEnum(CommunicationStatus, { each: true })
  status: CommunicationStatus[];

  @IsOptional()
  @IsArray()
  tag: number[];

  @IsOptional()
  @IsArray()
  strategic_priority: number[];

  @IsOptional()
  @IsArray()
  team: number[];

  @IsOptional()
  @IsArray()
  location: number[];

  @IsOptional()
  @IsArray()
  audience: number[];

  @IsOptional()
  @IsArray()
  channel: number[];

  @IsOptional()
  @IsArray()
  business_area: number[];

  @IsOptional()
  @IsArray()
  parent_folder_id: number[];

  @IsOptional()
  @IsArray()
  content_type: number[];
}

export class GetGanttChartCommunicationByPlanRequest {
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: string;

  @IsValidDate({
    message: "end date is invalid",
  })
  end_date: string;

  @IsOptional()
  @IsArray()
  plan_id: number[];

  @IsOptional()
  @IsArray()
  owner: number[];

  @IsOptional()
  @IsEnum(CommunicationStatus, { each: true })
  status: CommunicationStatus[];

  @IsOptional()
  @IsArray()
  tag: number[];

  @IsOptional()
  @IsArray()
  strategic_priority: number[];

  @IsOptional()
  @IsArray()
  team: number[];

  @IsOptional()
  @IsArray()
  location: number[];

  @IsOptional()
  @IsArray()
  audience: number[];

  @IsOptional()
  @IsArray()
  channel: number[];

  @IsOptional()
  @IsArray()
  business_area: number[];

  @IsOptional()
  @IsArray()
  parent_folder_id: number[];

  @IsOptional()
  @IsArray()
  content_type: number[];
}
