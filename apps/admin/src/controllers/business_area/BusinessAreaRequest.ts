import { IsOptional, IsString } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";

export class GetBusinessAreasRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;
}