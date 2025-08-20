import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateIf,
  ValidateNested,
  MinLength,
  ArrayNotEmpty,
  IsInt,
  Min,
} from "class-validator";
import {
  OrderDirectionRequest,
  PaginationParam,
  Subdomain,
} from "../../../app/controller/base/BaseRequest";
import { PlanStatus } from "../../../app/model/plan/PlanModel";
import {
  IsValidDate,
  IsDateGreaterThanEqual,
} from "../../../app/decorator/DateValidator";
import { UserPermission } from "../../../app/model/user/business_area_permission/UserBusinessAreaPermissionModel";
import { PostStatus } from "../../../app/model/social-post/SocialPostModel";
import { Type } from "class-transformer";
import { IsNotBlank } from "../../../app/decorator/IsNotBlank";
import { IsValidStatus } from "../../../app/decorator/IsValidStatus";
import { CommunicationStatus } from "../../../app/model/communication/CommunicationModel";

export enum PlanOrderColumnRequest {
  Title = "title",
  CreatedAt = "created_at",
  StartDate = "start_date",
  EndDate = "end_date",
}

enum EntityName {
  Plan = "plan",
  Communication = "communication",
}

export class FileTypeRequest {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  path: string;
}

export class CreatePlanRequest extends Subdomain {
  @IsNotEmpty() title: string;

  @ValidateIf((o) => ["networkrail"].includes(o.subdomain))
  @IsNotEmpty({ message: `$property is required for this company`})
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsOptional() parent_folder_id: number;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  objectives: string;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  key_messages: string;

  @IsArray() owner: number[];

  @IsOptional()
  @IsArray()
  team: number[];

  @IsValidDate({
    message: "Start date is invalid",
  })
  start_date: Date;

  @IsBoolean() ongoing: boolean;

  @IsOptional()
  @IsBoolean()
  show_on_calendar: boolean;

  @ValidateIf((data) => data.ongoing == false)
  @IsValidDate({
    message: "End date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsArray()
  @ArrayNotEmpty()
  business_areas: number[];

  @IsValidStatus("plan")
  status: PlanStatus;

  @IsOptional()
  @IsArray()
  tags: number[];

  @ValidateIf((o) => ["tfl"].includes(o.subdomain))
  @ArrayNotEmpty()
  strategic_priorities: number[];

  @IsOptional() color: string;

  @IsBoolean() is_confidential: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileTypeRequest)
  files: FileTypeRequest[];

  @IsOptional()
  @IsBoolean()
  dashboard_enabled: boolean;

  @IsOptional()
  @IsBoolean()
  hide_budget: boolean;
}

export class UpdatePlanRequest extends Subdomain {
  @IsNotEmpty() title: string;

  @IsOptional()
  @IsString()
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsOptional() parent_folder_id: number;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  objectives: string;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  key_messages: string;

  @IsArray() owner: number[];

  @IsValidDate({
    message: "Start date is invalid",
  })
  start_date: Date;

  @IsBoolean() ongoing: boolean;

  @IsOptional()
  @IsBoolean()
  show_on_calendar: boolean;

  @ValidateIf((data) => data.ongoing == false)
  @IsValidDate({
    message: "End date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsArray()
  @ArrayNotEmpty()
  business_areas: number[];

  @IsOptional()
  @IsArray()
  team: number[];

  @IsValidStatus("plan")
  status: PlanStatus;

  @IsOptional()
  @IsArray()
  tags: number[];

  @ValidateIf((o) => ["tfl"].includes(o.subdomain))
  @ArrayNotEmpty()
  strategic_priorities: number[];

  @IsOptional() color: string;

  @IsBoolean() is_confidential: boolean;

  @IsOptional()
  @IsBoolean()
  dashboard_enabled: boolean;

  @IsOptional()
  @IsBoolean()
  hide_budget: boolean;
}

export class OverrideActualBudgetRequest {
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget_actual: number;
}

export class GetPlanRequest extends PaginationParam {
  @IsOptional()
  _subdomain: string; // injected by middleware

  @IsOptional()
  @IsEnum(PlanOrderColumnRequest)
  column: PlanOrderColumnRequest;

  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  direction: OrderDirectionRequest;

  @IsOptional()
  @IsValidDate({
    message: "Start date is invalid",
  })
  start_date: string;

  @IsOptional()
  @IsValidDate({
    message: "End date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: string;

  @IsOptional()
  @IsArray()
  plan_id: number[];

  @IsOptional()
  @IsValidStatus("communication", {
    each: true,
  })
  status: CommunicationStatus[];

  @IsOptional()
  @IsArray()
  owner: number[];

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
  @IsBoolean()
  add_communication_info: boolean;

  @IsOptional()
  @IsArray()
  parent_folder_id: number[];

  @IsOptional()
  @IsArray()
  content_type: number[];

  @IsOptional()
  @IsBoolean()
  show_on_grid: boolean;
}

export class GetPlanCommunicationsRequest extends PaginationParam {
  @IsOptional()
  _subdomain: string; // injected by middleware

  @IsOptional()
  @IsEnum(PlanOrderColumnRequest)
  column: PlanOrderColumnRequest;

  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  direction: OrderDirectionRequest;

  @IsOptional()
  @IsValidStatus("communication", {
    each: true,
  })
  status: CommunicationStatus[];

  @IsOptional()
  @IsArray()
  owner: number[];

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

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  phase_id: number;

  // to fetch recurring comms
  @IsOptional()
  @IsNumber()
  parent_id: number;
}

export class UpdatePlanColorRequest {
  @IsString() color: string;
}

export class ArchivePlanRequest extends Subdomain {
  @IsValidStatus("plan")
  status: PlanStatus;
}

export class ArchiveMultiplePlanRequest {
  @IsArray() ids: number[];
}

export class DeletePlanRequest {
  @IsArray() ids: number[];
}

export class PlanSearchRequest extends PaginationParam {
  @IsOptional()
  _subdomain: string; // injected by middleware

  @IsOptional()
  @IsString()
  plan: string;

  @IsOptional()
  @IsValidStatus("plan", {
    each: true,
  })
  status: PlanStatus[];
}

export class PlanAndCommunicationSearchRequest extends PaginationParam {
  @IsOptional()
  _subdomain: string; // injected by middleware

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString({ each: true })
  status: CommunicationStatus[];

  @IsOptional()
  @IsEnum(EntityName)
  entity: EntityName;
}

export class PlanByStatusRequest {
  @IsEnum(PlanStatus, { each: true })
  status: PlanStatus[];
}

export class GetUsersByPlanIdRequest {
  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional() business_area?: number[];

  @IsOptional()
  @IsInt()
  communication_id: number;

  @IsOptional()
  @IsEnum(UserPermission, { each: true })
  business_area_permission?: UserPermission[];

  @IsOptional()
  @IsArray()
  roles?: number[];
}

export class DuplicatePlanRequest {
  @IsNotEmpty() title: string;

  @IsValidDate({
    message: "Start date is invalid",
  })
  start_date: Date;

  @IsBoolean() ongoing: boolean;

  @ValidateIf((data) => data.ongoing == false)
  @IsValidDate({
    message: "End date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;

  @IsOptional()
  @IsString()
  color: string;

  @IsOptional()
  @IsBoolean()
  duplicate_task: boolean;

  @IsOptional()
  @IsBoolean()
  duplicate_files: boolean;

  @IsOptional()
  @IsBoolean()
  duplicate_plan_on_page: boolean;
}

export class GetPlanSocialPostsRequest extends PaginationParam {
  @IsOptional()
  status: PostStatus;
}
export class AddPlanToFolderRequest {
  @IsNotEmpty()
  parent_folder_id: number;
}

export class AddFileRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileTypeRequest)
  files: FileTypeRequest[];
}

export class StarPlanRequest {
  @IsBoolean() is_starred: boolean;
}

export class UpdatePlanOnPageRequest {
  @IsOptional()
  @IsString()
  purpose: string;

  @IsOptional()
  @IsString()
  audience: string;

  @IsOptional()
  @IsString()
  objectives: string;

  @IsOptional()
  @IsString()
  barriers: string;

  @IsOptional()
  @IsString()
  messaging: string;

  @IsOptional()
  @IsString()
  how: string;

  @IsOptional()
  @IsString()
  stakeholders: string;

  @IsOptional()
  @IsString()
  impact: string;

  @IsOptional()
  @IsString()
  reaction: string;
}