import { Transform } from "class-transformer";
import { IsOptional, IsBoolean, IsNotEmpty, IsInt, IsString, IsISO31661Alpha2, Matches } from "class-validator";

export class UpdateCompanyRequest {
  @IsOptional() low_color: string;

  @IsOptional() high_color: string;

  @IsOptional()
  @IsInt()
  high_frequency: number;

  @IsNotEmpty()
  @IsBoolean()
  is_mfa_enabled: boolean;

  @IsOptional()
  @IsInt()
  notification_before_days: number;

  @IsOptional()
  @IsBoolean()
  notification_enabled: boolean;

  @IsOptional()
  @IsISO31661Alpha2()
  @Transform(({ value }) => value.toUpperCase())
  country_code: string;
}



export class AddBasicConfigurationRequest {
  @IsString()
  company_name: string;

  @IsString()
  @Matches(/^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/, {
    message: "Invalid full name"
  })
  full_name: string;
}