
import { PlanService } from "../plan/PlanService";
import { TaskService } from "../task/TaskService";
import {
  GetGanttChartRequest,
  GetGanttChartCommunicationByPlanRequest,
  GetGanttChartTaskByCommunicationRequest,
} from "../../../api/controller/gantt_chart/GanttChartRequest";
import { IRedisUserModel } from "../../model/user/UserModel";

@Injectable()
export class GanttChartService {
  constructor(
    private planService: PlanService,
    private taskService: TaskService
  ) {}

  public async GetGanttChartData(data: GetGanttChartRequest, user) {
    return this.planService.GetGanttChartData(data, user);
  }

  public async GetGanttChartCommunicationsByPlanId(
    planId,
    data: GetGanttChartCommunicationByPlanRequest,
    user: IRedisUserModel
  ) {
    return this.planService.GetGanttChartCommunicationsByPlanId(
      planId,
      data,
      user
    );
  }

  public async GetGanttChartTasksByCommunicationId(
    communicationId,
    data: GetGanttChartTaskByCommunicationRequest,
    user
  ) {
    return this.taskService.GetGanttChartTasksByCommunicationId(
      communicationId,
      data,
      user
    );
  }
}
