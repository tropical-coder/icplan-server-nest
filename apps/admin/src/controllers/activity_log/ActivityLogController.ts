import { Get, JsonController, Param, QueryParams, Res } from "routing-controllers";

import { ActivityLogService } from "../../../app/service/activity_log/ActivityLogService";
import { Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";
import { GetAdminActivityLogsRequest, GetUserActivityLogsRequest } from "./ActivityLogRequest";
import { AdminRole } from "../../../app/model/admin/AdminModel";

@ApiTags()
@Controller()
export class ActivityLogController {
  constructor(private activityLogService: ActivityLogService) {}

  @Authorized()
  @Get("/activity-log/user")
  async GetUserActivityLogs(
    @Query() data: GetUserActivityLogsRequest,
    @Res() res: Response,
  ) {
    const log = await this.activityLogService.GetUserActivityLogs(data);
    return log;
  }

  @Authorized()
  @Get("/activity-log/user/:logId([0-9]+)")
  async GetUserActivityLogById(
    @Param("logId") logId: number,
    @Res() res: Response,
  ) {
    const log = await this.activityLogService.GetUserActivityLogById(logId);
    return log;
  }

  @Authorized(AdminRole.SuperAdmin.toString())
  @Get("/activity-log/admin")
  async GetAdminActivityLogs(
    @Query() data: GetAdminActivityLogsRequest,
    @Res() res: Response,
  ) {
    const log = await this.activityLogService.GetAdminActivityLogs(data);
    return log;
  }

  @Authorized(AdminRole.SuperAdmin.toString())
  @Get("/activity-log/admin/:logId([0-9]+)")
  async GetAdminActivityLogById(
    @Param("logId") logId: number,
    @Res() res: Response,
  ) {
    const log = await this.activityLogService.GetAdminActivityLogById(logId);
    return log;
  }
}