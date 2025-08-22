import { IsOptional } from "class-validator";
import { PaginationParam } from "@app/common/base/base.dto";
import { IsValidDate, IsDateGreaterThanEqual } from "@app/common/decorators/date-validator.decorator";

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