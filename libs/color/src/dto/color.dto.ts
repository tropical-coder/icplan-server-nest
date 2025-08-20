import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayNotContains,
} from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Type } from "class-transformer";

export class CreateColorRequest {
  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsString()
  label: string;
}

export class UpdateColorRequest {
  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsString()
  label: string;
}

export class ColorSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  label: string;
}
