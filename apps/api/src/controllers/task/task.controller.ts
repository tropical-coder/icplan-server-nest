import { PaginationParam } from "../../../app/controller/base/BaseRequest";

import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  CreateTaskRequest,
  GetTasksForKanbanRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from "./TaskRequest";
import { TaskService } from "../../../app/service/task/TaskService";
import {
  Body,
  Post,
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Put,
  Param,
  Delete,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";

@ApiTags()
@Controller()
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Authorized()
  @Post("/task")
  async CreateTask(
    @Body() data: CreateTaskRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdTask = await this.taskService.CreateTask(data, user);
    return createdTask;
  }

  @Authorized()
  @Put("/task/:taskId([0-9]+)")
  async UpdateTask(
    @Param("taskId") taskId: number,
    @Body() data: UpdateTaskRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedTask = await this.taskService.UpdateTask(taskId, data, user);
    return updatedTask;
  }

  @Authorized()
  @Put("/task/status/:taskId([0-9]+)")
  async UpdateTaskStatus(
    @Param("taskId") taskId: number,
    @Body() data: UpdateTaskStatusRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedTask = await this.taskService.UpdateTaskStatus(
      taskId,
      data,
      user
    );
    return updatedTask;
  }

  @Authorized()
  @Delete("/task/:taskId([0-9]+)")
  async DeleteTask(
    @Param("taskId") taskId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.taskService.DeleteTask(taskId, user);
    return null;
  }

  @Authorized()
  @Get("/task")
  async GetTask(
    @Query() data: PaginationParam,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.taskService.GetTasks(data, user);
    return users;
  }

  @Authorized()
  @Get("/task/:communicationId([0-9]+)")
  async GetTaskByCommunicationId(
    @Param("communicationId") communicationId: number,
    @Query() data: PaginationParam,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const tasks = await this.taskService.GetTasksByCommunicationId(
      communicationId,
      data,
      user
    );
    return tasks;
  }

  @Authorized()
  @Get("/task/kanban")
  async GetTasksForKanban(
    @Query() data: GetTasksForKanbanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const tasks = await this.taskService.GetTasksForKanban(data, user);
    return tasks;
  }

  @Authorized()
  @Get("/task/single/:taskId([0-9]+)")
  async GetTaskById(
    @Param("taskId") taskId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const tasks = await this.taskService.GetTaskById(taskId, user);
    return tasks;
  }
}
