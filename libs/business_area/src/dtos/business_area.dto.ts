import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PaginationParam } from "@app/common/base/base.dto";

export class GetBusinessAreasRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}

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
