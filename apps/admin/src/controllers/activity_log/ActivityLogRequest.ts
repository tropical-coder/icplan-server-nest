import { IsEnum, IsInt, IsOptional } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { IsValidDate } from "../../../app/decorator/DateValidator";
import { ActivityEntity as UserActivityEntity } from "../../../app/model/activity_log/UserActivityLogModel";
import { ActivityEntity as AdminActivityEntity } from "../../../app/model/activity_log/AdminActivityLogModel";

export class GetUserActivityLogsRequest extends PaginationParam {
  @IsOptional()
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: string;

  @IsOptional()
  @IsValidDate({
    message: "end date is invalid",
  })
  end_date: string;

  @IsOptional()
  @IsEnum(UserActivityEntity)
  entity: UserActivityEntity;

  @IsOptional()
  @IsInt()
  company_id: number;
}

export class GetAdminActivityLogsRequest extends PaginationParam {
  @IsOptional()
  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: string;

  @IsOptional()
  @IsValidDate({
    message: "end date is invalid",
  })
  end_date: string;

  @IsOptional()
  @IsEnum(AdminActivityEntity)
  entity: AdminActivityEntity;
}