import { PaginationParam, OrderDirectionRequest } from "@app/common/base/base.dto";
import { IsValidDate, IsDateGreaterThanEqual } from "@app/common/decorators/date-validator.decorator";
import { PlanOrderColumnRequest } from "@app/plan/dto/plan.dto";
import { PlanStatus } from "@app/plan/entities/plan.entity";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";

export enum ParentFolderPage {
  Homepage = "homepage",
  ParentFolderPage = "parentfolder",
}

export class CreateParentFolderRequest {
  @IsString()
  name: string;

  @IsOptional()
  description: string;

  @IsNumber()
  @IsOptional()
  parent_folder_id: number;
}

export class UpdateParentFolderRequest {
  @IsString()
  name: string;

  @IsOptional()
  description: string;

  @IsNumber()
  @IsOptional()
  parent_folder_id: number;
}

export class GetParentFolderAndPlanRequest extends PaginationParam {
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
  @IsEnum(PlanStatus, { each: true })
  status: PlanStatus[];

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

  @ValidateIf((data) => data.page_type != ParentFolderPage.Homepage)
  @ArrayNotEmpty()
  @IsArray()
  parent_folder_id: number[];

  @IsOptional()
  @IsArray()
  content_type: number[];

  @IsOptional()
  @IsEnum(ParentFolderPage)
  page_type: ParentFolderPage;
}

export class ParentFolderSearchRequest {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  exclude_sub_folder: boolean;
}

export class CreateSubFolderRequest {
  @IsString()
  parent_folder_id: string;

  @IsString()
  name: string;
}

export class PinFolderRequest {
  @IsNotEmpty()
  @IsArray()
  parent_folder_id: number[]
}