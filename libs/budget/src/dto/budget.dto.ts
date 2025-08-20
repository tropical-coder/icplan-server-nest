import { IsNumber, IsString, Min } from "class-validator";

export class CreatePlanBudgetRequest {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  planned: number;

  @IsNumber()
  @Min(0)
  actual: number;

  @IsNumber()
  plan_id: number;
}

export class UpdatePlanBudgetRequest {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  planned: number;

  @IsNumber()
  @Min(0)
  actual: number;
}