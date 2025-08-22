import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Type } from "class-transformer";

export class CreateContentTypeRequest {
  @IsString()
  name: string;
}

export class UpdateContentTypeRequest {
  @IsOptional()
  @IsString()
  name: string;
}

class ContentType {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;
}

export class UpdateContentTypesRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentType)
  content_types: ContentType[];
}

export class ContentTypeSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  content_type: string;
}
