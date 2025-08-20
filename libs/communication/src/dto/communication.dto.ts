// Merged DTO file for communication
// This file combines CommunicationRequest and RecurringCommunicationRequest

// Communication DTOs
// =================
import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  IsEnum,
  ValidateIf,
  IsArray,
  Min,
  ArrayNotEmpty,
  ValidateNested,
  MinLength,
  Length,
} from "class-validator";
import { PaginationParam, Subdomain } from "../../../app/controller/base/BaseRequest";
import { CommunicationStatus } from "../../../app/model/communication/CommunicationModel";
import { IsValidStatus } from "../../../app/decorator/IsValidStatus";
import {
  IsValidDate,
  IsDateGreaterThanEqual,
  IsValidTime,
} from "../../../app/decorator/DateValidator";
import { PostStatus } from "../../../app/model/social-post/SocialPostModel";
import { Type } from "class-transformer";
import { FileTypeRequest } from "../plan/PlanRequest";
import { IsNotBlank } from "../../../app/decorator/IsNotBlank";
import { GridMainActivity } from "../../../app/model/communication/CommunicationGridModel";

export class CreateCommunicationRequest extends Subdomain {
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @IsNotEmpty()
  @IsNumber()
  owner_id: number;

  @IsNotEmpty() title: string;

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  objectives: string;

  @IsOptional() key_messages: string;

  @IsArray() team: number[];

  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: Date;

  @IsOptional()
  @IsBoolean()
  full_day: boolean;

  @IsValidDate({
    message: "end date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsBoolean() no_set_time: boolean;

  @ValidateIf((data) => data.no_set_time == false)
  @IsValidTime({
    message: "start time is invalid",
  })
  start_time: string;

  @ValidateIf((data) => data.no_set_time == false)
  @IsValidTime({
    message: "end time is invalid",
  })
  end_time: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_planned: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_actual: number;

  @IsOptional()
  @IsValidStatus("communication")
  status: CommunicationStatus;

  @IsArray() business_areas: number[];

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsArray()
  audience: number[];

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsArray()
  channels: number[];

  @IsOptional()
  @IsArray()
  locations: number[];

  @IsOptional()
  @IsArray()
  tags: number[];

  @ValidateIf((o) => ["tfl"].includes(o.subdomain))
  @ArrayNotEmpty()
  strategic_priorities: number[];

  @IsBoolean()
  is_confidential: boolean;

  @IsOptional()
  @IsBoolean()
  show_on_calendar: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileTypeRequest)
  files: FileTypeRequest[];

  @IsOptional()
  @IsArray()
  content_types: number[];

  @IsOptional()
  @IsBoolean()
  show_on_grid: boolean;

  @ValidateIf((o) => o.show_on_grid)
  @IsEnum(GridMainActivity)
  main_activity: GridMainActivity;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  rrule: string;
}

export class UpdateCommunicationInSwimlaneRequest {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  channels: number[];

  @IsOptional()
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: Date;

  @IsOptional()
  @IsValidDate({
    message: "end date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsOptional()
  @IsBoolean()
  update_recurring: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  strategic_priorities: number[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  audiences: number[];
}

export class UpdateCommunicationRequest extends Subdomain {
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @IsNotEmpty()
  @IsNumber()
  owner_id: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  objectives: string;

  @IsOptional() 
  @IsNotBlank()
  @MinLength(3)
  key_messages: string;

  @IsOptional()
  @IsArray()
  team: number[];

  @IsOptional()
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: Date;

  @IsOptional()
  @IsBoolean()
  full_day: boolean;

  @IsOptional()
  @IsValidDate({
    message: "end date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsBoolean() no_set_time: boolean;

  @ValidateIf((data) => data.no_set_time == false)
  @IsNotEmpty()
  @IsValidTime({
    message: "start time is invalid",
  })
  start_time: string;

  @ValidateIf((data) => data.no_set_time == false)
  @IsNotEmpty()
  @IsValidTime({
    message: "end time is invalid",
  })
  end_time: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_planned: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_actual: number;

  @IsValidStatus("communication")
  status: CommunicationStatus;

  @IsOptional()
  @ArrayNotEmpty()
  business_areas: number[];

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsArray()
  @ArrayNotEmpty()
  audience: number[];

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsArray()
  @ArrayNotEmpty()
  channels: number[];

  @IsOptional()
  @IsArray()
  locations: number[];

  @IsOptional()
  @IsArray()
  tags: number[];

  @ValidateIf((o) => ["tfl"].includes(o.subdomain))
  @ArrayNotEmpty()
  strategic_priorities: number[];

  @IsBoolean()
  is_confidential: boolean;

  @IsOptional()
  @IsBoolean()
  show_on_calendar: boolean;

  @IsOptional()
  @IsArray()
  content_types: number[];

  @IsOptional()
  @IsBoolean()
  update_recurring: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  rrule: string;

  @ValidateIf((o) => o.main_activity)
  @IsBoolean()
  show_on_grid: boolean;

  @ValidateIf((o) => o.show_on_grid)
  @IsEnum(GridMainActivity)
  main_activity: GridMainActivity;
}

export class UpdateCommunicationInlineRequest extends Subdomain {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: Date;

  @IsOptional()
  @IsValidDate({
    message: "end date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsBoolean() no_set_time: boolean;

  @ValidateIf((data) => data.no_set_time == false)
  @IsNotEmpty()
  @IsValidTime({
    message: "start time is invalid",
  })
  start_time: string;

  @ValidateIf((data) => data.no_set_time == false)
  @IsNotEmpty()
  @IsValidTime({
    message: "end time is invalid",
  })
  end_time: string;

  @IsOptional()
  @IsValidStatus("communication")
  status: CommunicationStatus;

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsArray()
  @ArrayNotEmpty()
  audience: number[];

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsArray()
  @ArrayNotEmpty()
  channels: number[];
}


export class UpdateCommunicationBudgetRequest {
  @IsNumber()
  @Min(0)
  budget_planned: number;

  @IsNumber()
  @Min(0)
  budget_actual: number;

  @IsOptional()
  @IsBoolean()
  update_recurring: boolean;
}

export class DeleteCommunicationRequest {
  @IsArray() ids: number[];

  @IsNumber()
  plan_id: number;
}

export class CommunicationSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString() 
  communication: string;

  @IsOptional()
  @IsNumber()
  plan_id: number;
}

export class DuplicateCommunicationRequest {
  @IsNotEmpty() title: string;

  @IsValidDate({
    message: "Start date is invalid",
  })
  start_date: string;

  @IsValidDate({
    message: "End date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: string;

  @IsOptional() duplicate_task: boolean;

  @IsOptional() duplicate_files: boolean;
}

export class GetCommunicationSocialPostsRequest extends PaginationParam {
  @IsOptional()
  status: PostStatus;
}

export class UpdateTaskPositionRequest {
  @IsArray()
  todo: number[];

  @IsArray()
  in_progress: number[];

  @IsArray()
  completed: number[];
}

export class UpdateCommunicationStatusRequest extends Subdomain {
  @IsValidStatus("communication")
  status: CommunicationStatus;

  @IsOptional()
  @IsBoolean()
  update_recurring: boolean;
}

export class GenerateWeeklyReportRequest extends Subdomain {
  @IsValidDate({ message: "Invalid date format. Please use YYYY-MM-DD" })
  start_date: string;

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
// Recurring Communication DTOs
// ===========================
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class UpdateCommunicationRRule {
  @IsNotEmpty()
  @IsString()
  @Length(1, 512)
  rrule: string;
}
