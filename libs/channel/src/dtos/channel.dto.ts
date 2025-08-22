import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayNotContains,
  IsBoolean,
  MinLength,
} from "class-validator";
import {
  OrderDirectionRequest,
  PaginationParam,
} from "../../../app/controller/base/BaseRequest";
import { Type } from "class-transformer";
import { IsNotBlank } from "../../../app/decorator/IsNotBlank";

export class CreateChannelRequest {
  @IsString()
  name: string;

  @IsOptional()
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsArray()
  business_areas: [];
}

export class UpdateChannelRequest {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsArray()
  business_areas: [];
}

class Channel {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  @IsNotBlank()
  @MinLength(3)
  description: string;
}

export class UpdateChannelsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Channel)
  channels: Channel[];
}

export class GetChannelRequest extends PaginationParam {
  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  sort: OrderDirectionRequest;

  @IsOptional()
  @IsString()
  name: string;
}

export class ChannelSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  channel: string;

  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  sort: OrderDirectionRequest;

  @IsOptional()
  @IsArray()
  @ArrayNotContains(["", " "], {
    message: "Business Areas should not contain empty values",
  })
  business_areas: number[];
}

export class UpdateChannelStatusRequest {
  @IsBoolean()
  is_archive: boolean;
}

export class DeleteChannelsRequest {
  @IsNotEmpty()
  @IsArray()
  channel_ids: number[];
}
