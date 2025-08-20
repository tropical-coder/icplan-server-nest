// Merged DTO file for $feature
// This file combines DTOs from both admin and API controllers

// Admin DTOs
// ===========
import { IsOptional, IsString } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";

export class GetBusinessAreasRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}
// API DTOs
// =========
import {
  IsEmail,
  Length,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  IsString,
  IsNumber,
  IsEnum,
  IsUrl,
  IsArray,
  ValidateNested,
  MinLength,
  Matches,
} from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Type } from "class-transformer";

export class CreateBusinessAreaRequest {
  @IsNotEmpty()
  name: string;
}

export class CreateSubBusinessAreaRequest {
  @IsNotEmpty()
  name: string;
}

export class UpdateBusinessAreaRequest {
  @IsNotEmpty()
  name: string;
}

class BusinessArea {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;
}

export class UpdateBusinessAreasRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessArea)
  business_areas: BusinessArea[];
}

export class BusinessAreaSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  business_area: string;
}

export class DeleteBusinessAreasRequest {
  @IsNotEmpty()
  @IsArray()
  business_area_ids: number[];
}

export class GetBusinessAreasRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}