import {
  IsBoolean,
  IsBooleanString,
  IsEnum,
  IsInt,
  IsISO31661Alpha2,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { Transform, Type } from "class-transformer";
import {
  SecondaryCalendarView,
  DefaultCalendarView,
  DateFormat,
  CalendarFormat,
} from "../../../app/model/company/CompanyModel";
import { PackageType } from "../../../app/model/package/PackageModel";

export class GetCompaniesRequest extends PaginationParam {
  @IsOptional()
  name: string;

  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @IsOptional()
  @IsEnum(PackageType)
  package_type: PackageType;

  @IsOptional()
  package_id: number;
}

export class CreateCompanyByAdminRequest {
  @IsNotEmpty()
  @Matches(
    /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i,
    {
      message: "Invalid Email.",
    }
  )
  email: string;

  @Length(1, 255)
  @IsNotEmpty()
  @Matches(/^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/, {
    message: "Invalid full name"
  })
  full_name: string;

  @Length(1, 255)
  @IsNotEmpty()
  company_name: string;

  // null means enterprise
  // otherwise the corresponding package price
  @IsOptional()
  @IsInt()
  price_id: number;

  @IsBoolean()
  send_verification_email: boolean;

  @IsOptional()
  quickbook_id: string;

  @IsNotEmpty()
  @IsBoolean()
  is_mfa_enabled: boolean;

  @IsNotEmpty()
  @IsBoolean()
  mfa_allowed: boolean;

  @IsOptional()
  @IsEnum(SecondaryCalendarView)
  secondary_calendar_view: SecondaryCalendarView;

  @IsOptional()
  @IsEnum(DefaultCalendarView)
  default_calendar_view: DefaultCalendarView;

  @IsOptional()
  @IsBoolean()
  show_key_messages: boolean;

  @IsOptional()
  @IsBoolean()
  show_content_type: boolean;

  @IsOptional()
  @IsBoolean()
  notification_enabled: boolean;

  @IsOptional()
  @IsInt()
  notification_before_days: number;

  @IsOptional()
  @IsEnum(DateFormat)
  date_format: DateFormat;

  @IsOptional()
  @IsEnum(CalendarFormat)
  calendar_format: CalendarFormat;

  @IsOptional()
  @IsBoolean()
  grid_enabled: boolean;

  @IsOptional()
  @IsBoolean()
  dashboard_enabled: boolean;

  @ValidateIf((data) => data.force_week_date == true)
  @Min(0)
  @Max(30)
  first_date: number;

  @IsNumber()
  @Min(0)
  @Max(6)
  first_day: number;

  @IsNumber()
  @Min(0)
  @Max(11)
  first_month: number;

  @ValidateIf((data) => data.force_week_date == false)
  @IsNumber()
  @Min(0)
  @Max(4)
  first_week: number;

  @IsOptional()
  @IsBoolean()
  force_week_date: boolean;

  @IsOptional()
  @IsISO31661Alpha2()
  @Transform(({ value }) => value.toUpperCase())
  country_code: string;
}

export class UpdateCompanyInfoRequest {
  @IsOptional()
  @Length(1, 255)
  company_name: string;

  @IsOptional()
  @IsBoolean()
  is_mfa_enabled: boolean;

  @IsOptional()
  @IsBoolean()
  mfa_allowed: boolean;

  @IsOptional()
  @IsBoolean()
  sso_allowed: boolean;

  @IsOptional() quickbook_id: string;

  @IsOptional()
  @IsEnum(SecondaryCalendarView)
  secondary_calendar_view: SecondaryCalendarView;

  @IsOptional()
  @IsEnum(DefaultCalendarView)
  default_calendar_view: DefaultCalendarView;

  @IsOptional()
  @IsBoolean()
  show_key_messages: boolean;

  @IsOptional()
  @IsBoolean()
  show_content_type: boolean;

  @IsOptional()
  @IsBoolean()
  notification_enabled: boolean;

  @IsOptional()
  @IsInt()
  notification_before_days: number;

  @IsOptional()
  @IsEnum(DateFormat)
  date_format: DateFormat;

  @IsOptional()
  @IsEnum(CalendarFormat)
  calendar_format: CalendarFormat;

  @IsOptional()
  @IsBoolean()
  grid_enabled: boolean;

  @IsOptional()
  @IsBoolean()
  dashboard_enabled: boolean;

  @ValidateIf((data) => data.force_week_date == true)
  @Min(0)
  @Max(30)
  first_date: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  first_day: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(11)
  first_month: number;

  @ValidateIf((data) => data.force_week_date == false)
  @IsNumber()
  @Min(0)
  @Max(4)
  first_week: number;

  @IsOptional()
  @IsBoolean()
  force_week_date: boolean;

  @IsOptional()
  @IsISO31661Alpha2()
  @Transform(({ value }) => value.toUpperCase())
  country_code: string;

  @IsOptional()
  @IsBoolean()
  is_active: boolean;
}

export class MfaEnabledCompaniesRequest {
  @IsNotEmpty()
  company_id: number;
}

export class SsoCredentialsRequest {
  @IsOptional()
  @IsBooleanString()
  sso_allowed: boolean;

  @IsOptional()
  @IsUUID("all")
  tenant_id: string;

  @IsOptional()
  @IsString()
  azure_issuer: string;
}

export class CreateSubdomainRequest {
  @IsNotEmpty()
  @IsString()
  subdomain: string;
}

export class UpdatePOPSubtitlesRequest {
  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  purpose: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  audience: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  objectives: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  barriers: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  messaging: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  how: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  stakeholders: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  impact: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  reaction: string;
}
