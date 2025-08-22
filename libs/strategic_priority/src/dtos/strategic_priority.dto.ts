import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { OrderDirectionRequest, PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Type } from "class-transformer";

export class CreateStrategicPriorityRequest {
  @IsNotEmpty()
  name: string;
}

export class UpdateStrategicPriorityRequest {
  @IsNotEmpty()
  name: string;
}

class StrategicPriority {
  @IsNumber()
  Id: number;

  @IsNotEmpty()
  name: string;
}

export class UpdateStrategicPrioritiesRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategicPriority)
  strategic_priorities: StrategicPriority[];
}

export class StrategicPrioritySearchRequest extends PaginationParam {
  @IsString()
  strategic_priority: string;
}

export class DeleteStrategicPriorities {
  @IsNotEmpty()
  @IsArray()
  strategic_priority_ids: number[];
}

export class GetStrategicPriorities extends PaginationParam {
  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  sort: OrderDirectionRequest;

  @IsOptional()
  @IsString()
  name: string;
}