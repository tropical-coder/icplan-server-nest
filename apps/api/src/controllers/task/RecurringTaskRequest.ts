import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { TaskStatus } from "../../../app/model/task/TaskModel";

export class UpdateTaskRRule {
  @IsNotEmpty()
  @IsString()
  @Length(1, 512)
  rrule: string;
}

export class GetRecurringTasksRequest extends PaginationParam {
  @IsNotEmpty()
  @IsInt()
  task_id: number;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(TaskStatus, { each: true })
  status: TaskStatus[];
}
