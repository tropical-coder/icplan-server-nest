import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  MinLength,
  IsNotEmpty,
  Length,
  IsInt,
} from "class-validator";
import { TaskStatus } from "../../../app/model/task/TaskModel";
import { IsValidDate } from "../../../app/decorator/DateValidator";
import { IsNotBlank } from "../../../app/decorator/IsNotBlank";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";

export class CreateTaskRequest {
  @IsString() name: string;

  @IsOptional()
  @IsString()
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsEnum(TaskStatus) status: TaskStatus;

  @IsNumber() assigned_to: number;

  @IsOptional()
  @IsNumber()
  communication_id: number;

  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @IsValidDate({
    message: "due_date is invalid",
  })
  due_date: Date;

  @IsArray() tags: number[];

  @IsOptional()
  @IsString()
  @Length(1, 512)
  rrule: string;
}

export class UpdateTaskRequest {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @IsNotBlank()
  @MinLength(3)
  description: string;

  @IsEnum(TaskStatus) status: TaskStatus;

  @IsOptional()
  @IsNumber()
  assigned_to: number;

  @IsOptional()
  @IsValidDate({
    message: "due_date is invalid",
  })
  due_date: Date;

  @IsOptional()
  @IsNumber()
  communication_id: number;

  @IsOptional()
  @IsNumber()
  plan_id: number;

  @IsArray() tags: number[];

  @IsOptional()
  @IsBoolean()
  update_recurring: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  rrule: string;
}
export class UpdateTaskStatusRequest {
  @IsEnum(TaskStatus) status: TaskStatus;

  @IsOptional()
  @IsBoolean()
  update_recurring: boolean;
}

export class GetTasksForKanbanRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  assigned_to: number[];

  @IsOptional()
  due_date: Date;

  @IsOptional()
  @IsEnum(TaskStatus, { each: true })
  status: TaskStatus[];

  @IsOptional()
  @IsArray()
  tag_ids: number[];

  @IsOptional()
  @IsArray()
  communication_ids: number[];

  @IsOptional()
  @IsArray()
  plan_ids: number[];

  @IsOptional()
  @IsBoolean()
  show_my_tasks_only: boolean;

  @IsOptional()
  @IsBoolean()
  show_plan_tasks_only: boolean;
}
