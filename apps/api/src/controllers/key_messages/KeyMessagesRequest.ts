import { IsOptional } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { IsDateGreaterThanEqual, IsValidDate } from "../../../app/decorator/DateValidator";

export class GetKMRequest extends PaginationParam {
  @IsOptional()
  @IsValidDate({
    message: "Start date is invalid",
  })
  start_date?: string;

  @IsOptional()
  @IsValidDate({
    message: "End date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date?: string;
}

export class UpdateKMRequest {
  @IsOptional()
  @IsValidDate({
    message: "Key message date is invalid",
  })
  date: Date;

  @IsOptional()
  key_messages: string;
}