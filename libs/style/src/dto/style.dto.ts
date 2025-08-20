import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateStyleRequest {
  @IsNotEmpty()
  @IsString()
  subdomain: string;

  @IsNotEmpty()
  @IsString()
  css: string;
}

export class GetStylesRequest {
  @IsOptional()
  @IsString()
  subdomain: string;

  @IsOptional()
  @IsNumber()
  company_id: number;
}

export class UpdateStyleRequest {
  @IsOptional()
  @IsString()
  subdomain: string;

  @IsOptional()
  @IsString()
  css: string;
}