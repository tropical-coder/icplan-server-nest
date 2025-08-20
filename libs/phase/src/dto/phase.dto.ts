import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";
import { PhaseStatus } from "../../../app/model/phase/PhaseModel";
import { IsDateGreaterThanEqual, IsValidDate } from "../../../app/decorator/DateValidator";

export class CreatePhaseRequest {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNumber()
  plan_id: number;

  @IsEnum(PhaseStatus)
  status: PhaseStatus;

  @IsNumber()
  owner_id: number;

  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: Date;

  @IsValidDate({
    message: "end date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;
}

export class UpdatePhaseRequest {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsEnum(PhaseStatus)
  status: PhaseStatus;

  @IsNumber()
  owner_id: number;

  @IsValidDate({
    message: "start date is invalid",
  })
  start_date: Date;

  @IsValidDate({
    message: "end date is invalid",
  })
  @IsDateGreaterThanEqual("start_date", {
    message: "End date must be greater than start date",
  })
  end_date: Date;
}
