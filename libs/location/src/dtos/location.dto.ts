import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { PaginationParam } from "@app/common/base/base.dto";
import { Type } from "class-transformer";

export class GetLocationRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}

export class CreateLocationRequest {
  @IsNotEmpty()
  name: string;
}

export class CreateSubLocationRequest {
  @IsNotEmpty()
  name: string;
}

export class UpdateLocationRequest {
  @IsNotEmpty()
  name: string;
}

class Location {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;
}

export class UpdateLocationsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  locations: Location[];
}

export class LocationSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  location: string;
}

export class DeleteLocationRequest {
  @IsNotEmpty()
  @IsArray()
  location_ids: number[];
}