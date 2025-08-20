
import { UserActivityLogRepository } from "../../repository/activity_log/UserActivityLogRepository";
import { GetUserActivityLogsRequest, GetAdminActivityLogsRequest } from "../../../admin/controller/activity_log/ActivityLogRequest";
import { AdminActivityLogRepository } from "../../repository/activity_log/AdminActivityLogRepository";

@Injectable()
export class ActivityLogService {
  constructor(
    private userActivityLogRepository: UserActivityLogRepository,
    private adminActivityLogRepository: AdminActivityLogRepository,
  ) {}

  public async GetUserActivityLogs(
    data: GetUserActivityLogsRequest,
  ) {
    const logs = await this.userActivityLogRepository.GetActivityLogs(data);

    return logs;
  }

  public async GetUserActivityLogById(logId: number) {
    return await this.userActivityLogRepository.FindById(logId);
  }

  public async GetAdminActivityLogs(
    data: GetAdminActivityLogsRequest,
  ) {
    const logs = await this.adminActivityLogRepository.GetActivityLogs(data);

    return logs;
  }
  public async GetAdminActivityLogById(logId: number) {
    return await this.adminActivityLogRepository.FindById(logId);
  }
}