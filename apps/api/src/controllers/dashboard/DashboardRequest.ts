import { IsBoolean, IsOptional } from "class-validator";
import { IsValidDate } from "../../../app/decorator/DateValidator";

export class DateRangeRequest {
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: string;

  @IsValidDate({
    message: "end date is invalid",
  })
  end_date: string;

}

export class GetCommunicationsForPlanDashboardRequest extends DateRangeRequest {
  @IsOptional()
  @IsBoolean()
  is_uncategorized: boolean;
}