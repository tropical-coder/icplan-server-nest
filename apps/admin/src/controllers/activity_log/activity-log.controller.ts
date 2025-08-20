import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ActivityLogService } from "@app/activity_log/activity_log.service";
import { GetAdminActivityLogsRequest, GetUserActivityLogsRequest } from "./ActivityLogRequest";
import { AdminRole } from "@app/administrator/entities/administrator.entity";
import { Authorized } from "@app/common/decorators/authorized.decorator";

@ApiTags('activity-log')
@Controller()
export class ActivityLogController {
  constructor(private activityLogService: ActivityLogService) {}

  @Authorized()
  @Get("/activity-log/user")
  async GetUserActivityLogs(
    @Query() data: GetUserActivityLogsRequest
  ): Promise<any> {
    const log = await this.activityLogService.GetUserActivityLogs(data);
    return log;
  }

  @Authorized()
  @Get("/activity-log/user/:logId")
  async GetUserActivityLogById(
    @Param("logId") logId: number
  ): Promise<any> {
    const log = await this.activityLogService.GetUserActivityLogById(logId);
    return log;
  }

  @Authorized(AdminRole.SuperAdmin)
  @Get("/activity-log/admin")
  async GetAdminActivityLogs(
    @Query() data: GetAdminActivityLogsRequest
  ): Promise<any> {
    const log = await this.activityLogService.GetAdminActivityLogs(data);
    return log;
  }

  @Authorized(AdminRole.SuperAdmin)
  @Get("/activity-log/admin/:logId")
  async GetAdminActivityLogById(
    @Param("logId") logId: number
  ): Promise<any> {
    const log = await this.activityLogService.GetAdminActivityLogById(logId);
    return log;
  }
}