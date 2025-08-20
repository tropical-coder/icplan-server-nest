import { CurrentUser, Get, JsonController, Param, Put, QueryParams, Res, Body} from "routing-controllers";

import { TaskService } from "../../../app/service/task/TaskService";
import { Authorized } from "../../../app/decorator/Authorized";
import { Response } from "express";
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { GetRecurringTasksRequest, UpdateTaskRRule } from "./RecurringTaskRequest";

@ApiTags()
@Controller()
export class RecurringTaskController {
  constructor(private taskService: TaskService) {}

  @Authorized()
  @Put("/task/recurring/:taskId([0-9]+)")
  async UpdateTaskRRule(
    @Param("taskId") taskId: number,
    @Body() data: UpdateTaskRRule,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const task = await this.taskService.UpdateTaskRRule(
      taskId,
      data,
      user,
    );
    return task;
  }

  @Authorized()
  @Get("/task/recurring")
  async GetRecurringTasks(
    @Query() query: GetRecurringTasksRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const recurringTasks = await this.taskService.GetRecurringTasks(
      query,
      user,
    );
    return recurringTasks;
  }
}