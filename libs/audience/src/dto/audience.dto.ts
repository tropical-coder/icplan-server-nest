import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayNotContains,
  IsEnum,
} from "class-validator";
import { OrderDirectionRequest, PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Type } from "class-transformer";

export class CreateAudienceRequest {
  @IsString()
  name: string;

  @IsArray()
  business_areas: number[];
}

export class UpdateAudienceRequest {
  @IsOptional()
  @IsString()
  name: string;

  @IsArray()
  business_areas: number[];
}

class Audience {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;
}

export class UpdateAudiencesRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Audience)
  audiences: Audience[];
}

export class AudienceSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  audience: string;

  @IsOptional()
  @IsArray()
  @ArrayNotContains(["", " "], {
    message: "Business Areas should not contain empty values",
  })
  business_areas: number[];
}

export class DeleteAudienceRequest {
  @IsNotEmpty()
  @IsArray()
  audience_ids: number[];
}

export class GetAudienceRequest extends PaginationParam {
  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  sort: OrderDirectionRequest;

  @IsOptional()
  @IsString()
  name: string;
}