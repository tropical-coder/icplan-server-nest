import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { PlanStatus } from "../../../app/model/plan/PlanModel";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Transform } from "class-transformer";


export class GetSavedFiltersRequest extends PaginationParam {
  @IsOptional()
  @IsBoolean()
  company_filters_only: boolean;
}

export class CreateSavedFilterRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  name: string;

  @IsNotEmpty()
  @IsObject()
  filters: Record<string, PlanStatus[] | number[]>;
}

export class RenameSavedFilterRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value.trim())
  name: string;
}

export class UpdateSavedFilterRequest {
  @IsNotEmpty()
  @IsObject()
  filters: Record<string, PlanStatus[] | number[]>;
}