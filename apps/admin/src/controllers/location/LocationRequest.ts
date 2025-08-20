import { IsOptional, IsString } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";

export class GetLocationRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}