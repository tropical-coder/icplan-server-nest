import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min, MinLength } from "class-validator";
import { RiskStatus } from "../../../app/model/risk/RiskModel";
import { OrderDirectionRequest, PaginationParam } from "../../../app/controller/base/BaseRequest";

export enum RiskOrderColumn {
  RiskNumber = "risk_number",
  Title = "title",
  Impact = "impact",
  Likelihood = "likelihood",
  Score = "score"
}

export class CreateRiskRequest {
  @IsInt()
  plan_id: number;

  @IsInt()
  owner_id: number;

  @IsString()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsInt()
  @Min(1)
  @Max(5)
  impact: number;

  @IsInt()
  @Min(1)
  @Max(5)
  likelihood: number;

  @IsOptional()
  @IsString()
  mitigation: string;

  @IsEnum(RiskStatus)
  status: RiskStatus;
}

export class GetRisksRequest extends PaginationParam {
  @IsInt()
  plan_id: number;

  @IsOptional()
  @MinLength(1)
  risk_number: string;

  @IsOptional()
  @IsInt()
  owner_id: number;

  @IsOptional()
  @IsEnum(RiskStatus)
  status: RiskStatus;

  @IsOptional()
  @IsEnum(RiskOrderColumn)
  column: RiskOrderColumn;

  @IsOptional()
  @IsEnum(OrderDirectionRequest)
  direction: OrderDirectionRequest;
}