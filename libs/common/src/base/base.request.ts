import { IsOptional } from "class-validator";

export class PaginationParam {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export enum OrderDirectionRequest {
  ASC = "ASC",
  DESC = "DESC",
}

export class Subdomain {
  @IsOptional()
  _subdomain: string;
}