import { IsValidDate } from "../../../app/decorator/DateValidator";
import { IsOptional, IsEnum, IsArray, IsNotEmpty, IsBoolean } from "class-validator";
import { CommunicationStatus } from "../../../app/model/communication/CommunicationModel";
import { IsValidStatus } from "../../../app/decorator/IsValidStatus";
import { OrderDirectionRequest, Subdomain } from "../../../app/controller/base/BaseRequest";

export enum SwimlaneGroupBy {
  Channel = "channels",
  StrategicPriority = "strategic_priorities",
  Audience = "audiences",
}

export class CalendarHeatMapRequest extends Subdomain {
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
  @IsValidStatus("communication", { each: true })
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

export class CalendarEventRequest extends Subdomain {
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
  @IsValidStatus("communication", { each: true })
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

export class SwimlaneExcelRequest extends CalendarEventRequest {
  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  sort: OrderDirectionRequest;

  @IsNotEmpty()
  @IsEnum(SwimlaneGroupBy)
  group_by: SwimlaneGroupBy;

  @IsOptional()
  @IsBoolean()
  hide_empty_lanes: boolean;
}
