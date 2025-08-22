import { IsOptional, IsEnum, IsArray, IsNumber } from "class-validator";
import { IsValidDate } from "../../../app/decorator/DateValidator";
import { CommunicationStatus } from "../../../app/model/communication/CommunicationModel";
import { IsValidStatus } from "../../../app/decorator/IsValidStatus";
import { Subdomain } from "../../../app/controller/base/BaseRequest";

export class AnalyticsRequest extends Subdomain {
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

export class GetMostActivePlansRequest extends AnalyticsRequest {
  @IsOptional()
  @IsNumber()
  page: number;

  @IsOptional()
  @IsNumber()
  limit: number;
}

export class GetCommunicationsLiveTodayRequest extends Subdomain {
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


