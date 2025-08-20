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

export class CreateTagRequest {
  @IsNotEmpty()
  name: string;
}

export class UpdateTagRequest {
  @IsNotEmpty()
  tag: string;
}

class Tag {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;
}

export class UpdateTagsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Tag)
  tags: Tag[];
}

export class TagSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  tag: string;
}

export class DeleteTagsRequest {
  @IsNotEmpty()
  @IsArray()
  tag_ids: number[];
}

export class GetTagsRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}