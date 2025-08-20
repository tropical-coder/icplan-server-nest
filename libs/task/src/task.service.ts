import { CommunicationPermissionRepository } from '../../repository/communication/CommunicationPermissionRepository';
import { TaskStatus } from "../../model/task/TaskModel";
import { BadRequestException } from "routing-controllers";
import { TaskRepository } from "../../repository/task/TaskRepository";
import { UserRepository } from "../../repository/user/UserRepository";
import { CommunicationRepository } from "../../repository/communication/CommunicationRepository";
import { PlanRepository } from "../../repository/plan/PlanRepository";
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { TagService } from "../tag/TagService";

import { TaskModel } from "../../model/task/TaskModel";
import {
  CreateTaskRequest,
  GetTasksForKanbanRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from "../../../api/controller/task/TaskRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { DeepClone, GetPaginationOptions } from "../../helpers/UtilHelper";
import { GetGanttChartTaskByCommunicationRequest } from "../../../api/controller/gantt_chart/GanttChartRequest";
import { CheckUserPermissionForCommunicationEdit, CheckUserPermissionForPlanEdit } from "../../helpers/PermissionHelper";
import { PlanPermissionModel } from "../../model/plan/PlanPermissionModel";
import { UserPermission } from "../../model/user/business_area_permission/UserBusinessAreaPermissionModel";
import {
  IRedisUserModel,
  UserModel,
  UserRoles,
} from "../../model/user/UserModel";
import { NotificationService } from "../notification/NotificationService";
import { NotificationConstants } from "../../constant/NotificationConstants";
import { CommunicationModel } from "../../model/communication/CommunicationModel";
import { GetRecurringTasksRequest, UpdateTaskRRule } from "../../../api/controller/task/RecurringTaskRequest";
import * as RRule from "rrule";
import { appEnv } from "../../helpers/EnvHelper";
import { CompanyModel } from "../../model/company/CompanyModel";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { ActiveCampaignService } from '../active_campaign/ActiveCampaignService';

@Injectable()
export class TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private userRepository: UserRepository,
    private planRepository: PlanRepository,
    private communicationRepository: CommunicationRepository,
    private planPermissionRepository: PlanPermissionRepository,
    private tagService: TagService,
    private notificationService: NotificationService,
    private companyRepository: CompanyRepository,
    private communicationPermissionRepository: CommunicationPermissionRepository,
    private activeCampaignService: ActiveCampaignService,
  ) {}

  private async SendStatusChangedNotification(
    task: TaskModel,
    user: UserModel
  ) {
    if (!task.user.company.notification_enabled) {
      return false;
    }

    const constant = DeepClone(NotificationConstants.TaskStatusChanged);
    constant.body = constant.body
      .replace("{{name}}", task.name)
      .replace("{{status}}", task.status.replace("in_progress", "in progress"));

    constant.info = {
      task_id: task.Id,
      communication_id: task.communication_id,
      plan_id: task.plan_id,
    };

    await this.notificationService.SendNotification(
      constant,
      [user],
      "status_change_notification"
    );

    return true;
  }

  // Send notification to old and new assignee
  private async SendTaskAssigneeChangeNotification(
    task: TaskModel,
    oldAssignee: UserModel,
    newAssignee: UserModel
  ) {
    if (!task.user.company.notification_enabled) {
      return false;
    }

    const data = {
      task_id: task.Id,
      communication_id: task.communication_id,
      plan_id: task.plan_id
    };

    if (newAssignee?.user_setting?.assignment_notification) {
      const constant = DeepClone(NotificationConstants.TaskAssigned);
      constant.body = constant.body.replace("{{name}}", task.name);
      constant.info = data;

      await this.notificationService.SendNotification(
        constant,
        [newAssignee],
        "assignment_notification"
      );
    }

    if (oldAssignee?.user_setting?.assignment_notification) {
      const constant = DeepClone(NotificationConstants.TaskUnassigned);
      constant.body = constant.body.replace("{{name}}", task.name);
      constant.info = data;

      await this.notificationService.SendNotification(
        constant,
        [oldAssignee],
        "assignment_notification"
      );
    }

    return true;
  }

  private validateRRule(parentTask: TaskModel, rrule: string, company: CompanyModel) {
    if (!rrule) return;

    let dueDates: Date[] = [];
    try {
      // Get dates from recursion rule
      dueDates = RRule.rrulestr(rrule).all();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    if (!dueDates.length) {
      throw new BadRequestException("Invalid rrule string.");
    }
    if (company.task_count + dueDates.length > company.subscription.features.task_limit) {
      throw new BadRequestException("Task limit exceeded.");
    }
    if (dueDates.length > +appEnv("MAX_RECURRING_COMMUNICATIONS")) {
      throw new BadRequestException(
        `Recurring task can't be more than ${appEnv(
          "MAX_RECURRING_COMMUNICATIONS"
        )}.`
      );
    }

    const firstTaskDueDate = dueDates[0];
    const lastTaskDueDate = dueDates[dueDates.length - 1];

    if (parentTask.plan_id) {
      const planEndDate = new Date(parentTask.plan.end_date);
      planEndDate.setHours(23, 59, 59, 999);
      if (
        firstTaskDueDate < new Date(parentTask.plan.start_date) ||
        (!parentTask.plan.ongoing && lastTaskDueDate > planEndDate)
      ) {
        throw new BadRequestException(
          "One of the recurring task is exceeding the plan date range."
        );
      }
    }
  }

  private async generateRecurringTasks(
    parentTask: TaskModel,
    rrule: string,
    user: IRedisUserModel,
    status: TaskStatus = TaskStatus.Todo
  ) {
    let dueDates = RRule.rrulestr(rrule).all();
    // Delete existing recurring tasks and then regenerate
    if (parentTask.rrule) {
      await this.taskRepository.Delete(
        {
          parent_id: parentTask.Id,
          company_id: user.company_id,
        },
        false
      );
    }

    const recurringTasks = dueDates.map((dueDates) => {
      let taskModel = new TaskModel();
      Object.assign(taskModel, parentTask);

      taskModel.Id = null;
      taskModel.parent_id = parentTask.Id;
      taskModel.rrule = null;
      taskModel.status = status;
      delete taskModel.plan;
      delete taskModel.communication;

      taskModel.due_date = dueDates;

      return taskModel;
    });

    parentTask.rrule = rrule;
    await Promise.all([
      this.taskRepository.Update(
        { Id: parentTask.Id },
        { rrule: parentTask.rrule }
      ),
      this.taskRepository.CreateAll(recurringTasks)
    ]);

    return parentTask;
  }

  private async updateTaskCountOnActiveCampaign(companyId: number) {
    if (!appEnv("AC_ENABLED")) {
      return;
    }
    const [companyOwner, taskCount] = await Promise.all([
      this.userRepository.FindOne({
        company_id: companyId,
        role: UserRoles.Owner,
      }),
      this.taskRepository.Count({ company_id: companyId }),
    ]);

    await this.activeCampaignService.UpdateCustomFieldValue(
      companyOwner.email,
      [
        {
          field: appEnv("AC_FIELD_TASK_COUNT"),
          value: taskCount,
        },
      ]
    );
  }

  public async CreateTask(
    data: CreateTaskRequest,
    user: IRedisUserModel
  ): Promise<TaskModel> {
    const tagsPromise = this.tagService.fetchTags(data.tags, user.company_id);
    const assignedToPromise = this.userRepository.FindById(data.assigned_to, {
      relations: ["company"],
    });
    const planPromise = this.planRepository.FindOne({
      Id: data.plan_id,
      company_id: user.company_id,
    });
    const companyPromise = this.companyRepository.GetCompanyWithCounts(user.company_id);

    const [tags, assignedTo, plan, company] = await Promise.all([
      tagsPromise,
      assignedToPromise,
      planPromise,
      companyPromise
    ]);

    if (!plan) {
      throw new BadRequestException("Plan Not Found");
    }

    if (company.task_count >= company.subscription.features.task_limit) {
      throw new BadRequestException("Task limit exceeded.")
    }

    let communication: CommunicationModel;
    if (data.communication_id) {
      await CheckUserPermissionForCommunicationEdit(this, data.communication_id, user);
      communication = await this.communicationRepository.FindOne(
        {
          Id: data.communication_id,
          plan_id: data.plan_id
        },
        {
          relations: ["team"],
        }
      );

      if (!communication) {
        throw new BadRequestException("Communication Not Found");
      }
    } else {
      await CheckUserPermissionForPlanEdit(this, plan.Id, user);
    }

    let taskModel = new TaskModel();
    taskModel.company_id = user.company_id;
    taskModel.name = data.name;
    taskModel.description = data.description;
    taskModel.status = data.status;
    taskModel.assigned_to = assignedTo.Id;
    taskModel.communication_id = data.communication_id || null;
    taskModel.plan_id = data.plan_id;
    taskModel.due_date = data.due_date;
    taskModel.tags = tags;
    taskModel.plan = plan;

    this.validateRRule(taskModel, data.rrule, company);
    delete taskModel.plan;

    const newTask = await this.taskRepository.Create(taskModel);

    if (data.rrule) {
      newTask.plan = plan;
      try {
        await this.generateRecurringTasks(newTask, data.rrule, user);
      } catch (error) {
        if (error instanceof BadRequestException) {
          await this.taskRepository.DeleteById(newTask.Id, false);
        }
        throw error;
      }
    }

    if (
      assignedTo.user_setting?.assignment_notification &&
      assignedTo.company.notification_enabled
    ) {
      const constant = DeepClone(NotificationConstants.TaskAssigned);
      constant.body = constant.body.replace("{{name}}", taskModel.name);
      constant.info = {
        task_id: newTask.Id,
        communication_id: data.communication_id || null,
        plan_id: data.plan_id,
      };
      this.notificationService.SendNotification(
        constant,
        [assignedTo],
        "assignment_notification"
      );
    }

    this.updateTaskCountOnActiveCampaign(user.company_id);
    const task = await this.taskRepository.FindById(newTask.Id, {
      relations: ["user", "tags", "communication", "plan"],
    });

    return task;
  }

  public async UpdateTask(
    taskId: number,
    data: UpdateTaskRequest,
    user: IRedisUserModel
  ) {
    let taskModel: TaskModel = await this.taskRepository.FindOne(
      {
        Id: taskId,
        company_id: user.company_id,
      },
      { relations: ["user", "user.company", "communication", "plan"] }
    );

    if (!taskModel) {
      throw new BadRequestException("Not Found");
    }

    const tagsPromise = this.tagService.fetchTags(data.tags, user.company_id);
    const assignedToPromise = this.userRepository.FindById(
      data.assigned_to,
      { relations: ["user_setting", "company"] }
    );

    let generateRecurrings: boolean = false;
    if (
      data.update_recurring &&
      data.due_date &&
      data.due_date != taskModel.due_date &&
      taskModel.rrule
    ) {
      if (!data.rrule) {
        throw new BadRequestException(
          "RRule is required for updating due date in bulk update."
        );
      }
      generateRecurrings = true;
    }

    let plan = taskModel.plan;
    if (data.plan_id && data.plan_id != taskModel.plan_id) {
      plan = await this.planRepository.FindOne({
        Id: data.plan_id,
        company_id: user.company_id,
      });

      if (!plan) {
        throw new BadRequestException("Plan Not Found");
      }

      const dueDate = data.due_date ?? taskModel.due_date;
      if (
        dueDate < plan.start_date || 
        (!plan.ongoing && dueDate > plan.end_date)
      ) {
        throw new BadRequestException("Task due date is exceeding the plan date range.");
      }
      taskModel.plan_id = plan.Id;
    }

    if (data.communication_id && !plan) {
      throw new BadRequestException("The task is floating, please assign it to a plan first.");
    }

    let communication: CommunicationModel = null;
    if (data.communication_id && data.communication_id != taskModel.communication_id) {
      if (data.update_recurring === false) {
        throw new BadRequestException("Communication cannot be changed for a single task in recurring set.")
      }
      communication =
        await this.communicationRepository.GetCommunicationByIdForTask(
          data.communication_id,
          user.company_id
        );

      if (!communication) {
        throw new BadRequestException("Communication Not Found");
      }

      if (communication.plan_id != plan?.Id) {
        throw new BadRequestException("Communication doesn't belong to this plan");
      }

      taskModel.communication_id = communication.Id;
    } else if (!data.communication_id) {
      taskModel.communication_id = null;
    }

    if (taskModel.communication_id) {
      await CheckUserPermissionForCommunicationEdit(
        this,
        taskModel.communication_id,
        user
      );
    } else {
      await CheckUserPermissionForPlanEdit(this, taskModel.plan_id, user);
    }

    const [tags, assignedTo] = await Promise.all([
      tagsPromise,
      assignedToPromise,
    ]);

    if (assignedTo?.is_deleted) {
      throw new BadRequestException(
        "This Task contains deleted user highlighted in gray, please update it with alternative user."
      );
    }

    const notificationCondition: boolean = (
      !data.update_recurring ||                       // if single update or
      (data.update_recurring && !taskModel.parent_id) // if updating in bulk, then send for parent only
    );

    taskModel.name = data.name || taskModel.name;
    const oldStatus = taskModel.status;
    taskModel.status = data.status;
    if (
      data.status &&
      data.status != oldStatus &&
      notificationCondition
    ) {
      this.SendStatusChangedNotification(
        taskModel,
        data.assigned_to ? assignedTo : taskModel.user
      );
    }

    if (
      data.assigned_to &&
      data.assigned_to != taskModel.assigned_to &&
      notificationCondition
    ) {
      this.SendTaskAssigneeChangeNotification(
        taskModel,
        taskModel.user,
        assignedTo
      );
    }

    communication = communication || taskModel.communication;
    delete taskModel.communication;
    delete taskModel.plan;
    taskModel.description = data.description;
    taskModel.due_date = data.due_date || taskModel.due_date;
    taskModel.assigned_to = data.assigned_to
      ? assignedTo.Id
      : taskModel.assigned_to;
    taskModel.user = data.assigned_to ? assignedTo : taskModel.user;
    taskModel.tags = [];
    await this.taskRepository.Save(taskModel);

    taskModel.tags = tags;
    await this.taskRepository.Save(taskModel);

    delete taskModel.user.company;
    delete taskModel.user.user_setting;
    taskModel.communication = communication;
    taskModel.plan = plan;

    if (
      taskModel.rrule &&        // ==> having rrule means it's a parent recurring communication
      data.update_recurring &&  // ==> bulk update flag
      !generateRecurrings       // ==> indicates that RRule updation is signalled, So no need to update 
                                //     child tasks as it will be deleted and regenerated
    ) {
      const recurringTasks = await this.taskRepository.Find({
        parent_id: taskModel.Id,
      });

      await Promise.all(recurringTasks.map((task) => {
        return this.UpdateTask(task.Id, data, user);
      }));
    }

    if (generateRecurrings) {
      const [childTasks, company] = await Promise.all([
        this.taskRepository.Count({ parent_id: taskModel.Id }),
        this.companyRepository.GetCompanyWithCounts(user.company_id)
      ]);

      company.task_count -= childTasks;
      this.validateRRule(taskModel, data.rrule, company);
      await this.generateRecurringTasks(
        taskModel,
        data.rrule,
        user,
        data.status
      );
    }

    this.updateTaskCountOnActiveCampaign(user.company_id);

    return { task: taskModel };
  }

  public async UpdateTaskStatus(
    taskId: number,
    data: UpdateTaskStatusRequest,
    user: IRedisUserModel
  ) {
    let taskModel: TaskModel = await this.taskRepository.FindOne(
      { Id: taskId, company_id: user.company_id },
      { relations: ["user", "user.company"] }
    );

    if (!taskModel) {
      throw new BadRequestException("Not Found");
    }

    let communication: CommunicationModel = null;
    if (taskModel.communication_id) {
      communication = await this.communicationRepository.FindOne(
        { Id: taskModel.communication_id },
        {
          relations: ["team"],
        }
      );

      if (!communication) {
        throw new BadRequestException("Communication Not Found");
      }

      await CheckUserPermissionForCommunicationEdit(this, taskModel.communication_id, user);
    } else {
      await CheckUserPermissionForPlanEdit(this, taskModel.plan_id, user);
    }

    if (taskModel.rrule && data.update_recurring) {
      const recurringTasks = await this.taskRepository.Find({
        parent_id: taskModel.Id,
      });

      await Promise.all(recurringTasks.map((comm) => {
        return this.UpdateTaskStatus(
          comm.Id,
          data,
          user,
        );
      }));
    }

    const notificationCondition: boolean = (
      !data.update_recurring ||                       // if single update or
      (data.update_recurring && !taskModel.parent_id) // if updating in bulk, then send for parent only
    );

    taskModel.communication = communication;
    if (data.status && data.status != taskModel.status) {
      taskModel.status = data.status;

      if (taskModel.assigned_to != user.Id && notificationCondition) {
        this.SendStatusChangedNotification(taskModel, taskModel.user);
      }

      await this.taskRepository.Update({ Id: taskId }, { status: data.status });
    }

    delete taskModel.user.company;
    delete taskModel.communication;

    return { task: taskModel };
  }

  public async DeleteTask(taskId: number, user: IRedisUserModel) {
    const taskModel = await this.taskRepository.FindOne({
      Id: taskId,
      company_id: user.company_id,
    });

    if (!taskModel) {
      throw new BadRequestException("Not Found");
    }

    if (taskModel.communication_id) {
      await CheckUserPermissionForCommunicationEdit(
        this,
        taskModel.communication_id,
        user
      );
    } else {
      await CheckUserPermissionForPlanEdit(this, taskModel.plan_id, user);
    }

    await this.taskRepository.DeleteById(taskId, false);
    return null;
  }

  public async GetTask(taskId: number): Promise<TaskModel> {
    return await this.taskRepository.FindById(taskId, {
      relations: ["user", "tags"],
    });
  }

  public async GetTasks(
    data: PaginationParam,
    user: IRedisUserModel
  ): Promise<{
    tasks: Array<TaskModel>;
    count: number;
    page: number;
    limit: number;
    plan_permission: PlanPermissionModel[];
  }> {
    let planPermission: PlanPermissionModel[] = [];
    const [tasks, count] = await this.taskRepository.FindAndCount(
      { company_id: user.company_id },
      GetPaginationOptions(data),
      ["user", "tags", "communication", "plan"]
    );
    if (tasks.length && user.role !== UserRoles.User) {
      const planId = tasks[0].plan_id;
      planPermission = await this.planPermissionRepository.FindPlanPermission(
        [planId],
        user.Id,
        UserPermission.Edit
      );
    }
    return {
      tasks: tasks,
      count: count,
      page: data.page,
      limit: data.limit,
      plan_permission: planPermission,
    };
  }

  public async GetTasksByCommunicationId(
    communicationId: number,
    data: PaginationParam,
    user: IRedisUserModel
  ): Promise<{
    tasks: Array<TaskModel>;
    count: number;
    page: number;
    limit: number;
    plan_permission: PlanPermissionModel[];
  }> {
    let planPermission: PlanPermissionModel[] = [];
    //TODO: limit data in this call
    const { tasks, count } =
      await this.taskRepository.GetTasksByCommunicationId(
        user.company_id,
        communicationId,
        data
      );

    let planId;
    if (tasks.length) {
      planId = tasks[0].plan_id;
    } else {
      const comm = await this.communicationRepository.FindById(communicationId);
      planId = comm.plan_id;
    }

    planPermission = await this.planPermissionRepository.FindPlanPermission(
      [planId],
      user.Id,
      UserPermission.Edit
    );

    return {
      tasks: tasks,
      count: count,
      page: data.page,
      limit: data.limit,
      plan_permission: planPermission,
    };
  }

  public async GetTasksByDateRange(data, user: IRedisUserModel) {
    const tasks = await this.taskRepository.GetTasksByDateRange(data, user);
    return tasks;
  }

  public async GetGanttChartTasksByCommunicationId(
    communicationId: number,
    data: GetGanttChartTaskByCommunicationRequest,
    user: IRedisUserModel
  ): Promise<{
    tasks: Array<TaskModel>;
    count: number;
    plan_permission: PlanPermissionModel[];
  }> {
    let planPermission: PlanPermissionModel[] = [];
    const [tasks, count] =
      await this.taskRepository.GetGanttChartTasksByCommunicationId(
        user,
        communicationId,
        data
      );
    if (tasks && tasks.length && user.role !== UserRoles.User) {
      const planId = tasks[0].communication?.plan_id;
      planPermission = await this.planPermissionRepository.FindPlanPermission(
        [planId],
        user.Id,
        UserPermission.Edit
      );
    }
    return { tasks: tasks, count: count, plan_permission: planPermission };
  }

  public async GetTasksForKanban(
    data: GetTasksForKanbanRequest,
    user: IRedisUserModel
  ): Promise<{ tasks: TaskModel[]; count: number }> {
    const tasks = await this.taskRepository.GetTasksForKanban(data, user);

    return tasks;
  }

  public async GetTaskById(
    taskId: number,
    user: IRedisUserModel,
  ): Promise<TaskModel> {
    const task = await this.taskRepository.GetTaskById(
      taskId,
      user,
    );

    if (!task) {
      throw new BadRequestException("Task not found.");
    }

    return task;
  }

  public async UpdateTaskRRule(
    taskId: number,
    data: UpdateTaskRRule,
    user: IRedisUserModel
  ) {
    const taskModelPromise = this.taskRepository.FindOne(
      {
        Id: taskId,
        company_id: user.company_id,
      },
      { relations: ["plan", "communication", "tags"] }
    );
    const companyPromise = this.companyRepository.GetCompanyWithCounts(user.company_id);
    const childTasksPromise = this.taskRepository.Count({
      parent_id: taskId,
    });

    const [taskModel, company, childTasks] = await Promise.all([
      taskModelPromise,
      companyPromise,
      childTasksPromise,
    ]);

    if (!taskModel) {
      throw new BadRequestException("Task Not Found");
    }

    if (taskModel.parent_id) {
      throw new BadRequestException("This task is part of recurring communication.");
    }

    if (taskModel.communication_id) {
      await CheckUserPermissionForCommunicationEdit(
        this,
        taskModel.communication_id,
        user
      );
    } else {
      await CheckUserPermissionForPlanEdit(this, taskModel.plan_id, user);
    }

    company.task_count -= childTasks;
    this.validateRRule(taskModel, data.rrule, company);

    const [task] = await Promise.all([
      this.taskRepository.GetTaskById(taskId, user),
      this.generateRecurringTasks(taskModel, data.rrule, user),
    ]);

    this.updateTaskCountOnActiveCampaign(user.company_id);

    task.rrule = data.rrule;
    return task;
  }

  public async GetRecurringTasks(
    data: GetRecurringTasksRequest,
    user: IRedisUserModel
  ) {
    const task = await this.taskRepository.FindOne({
      Id: data.task_id,
      company_id: user.company_id,
    });

    if (!task) {
      throw new BadRequestException("Task Not Found");
    }

    const recurringComms = await this.taskRepository.GetRecurringTasks(data, user);
    return recurringComms;
  }
}
