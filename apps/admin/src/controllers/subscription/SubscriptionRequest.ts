import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum KeyMessaging {
  Basic = "basic",
  Advanced = "advanced",
}

export class Features {
  @IsInt()
  normal_user_limit: number;

  @IsOptional()
  @IsInt()
  readonly_user_limit?: number;

  @IsInt()
  plan_limit: number;

  @IsInt()
  communication_limit: number;

  @IsInt()
  task_limit: number;

  @IsInt()
  business_area_limit: number;

  @IsInt()
  audience_limit: number;

  @IsInt()
  channel_limit: number;

  @IsInt()
  location_limit: number;

  @IsInt()
  strategic_priority_limit: number;

  @IsBoolean()
  analytics: boolean;

  @IsBoolean()
  advanced_analytics: boolean;

  @IsBoolean()
  reporting: boolean;

  @IsBoolean()
  branding: boolean;

  @IsBoolean()
  subdomain: boolean;

  @IsBoolean()
  sso: boolean;

  @IsBoolean()
  yammer: boolean;

  @IsBoolean()
  teams: boolean;

  @IsBoolean()
  comment: boolean;

  @IsBoolean()
  plan_on_page: boolean;

  @IsEnum(KeyMessaging)
  key_messaging: KeyMessaging;
}

export class UpdateSubscriptionByAdminRequest {
  @ValidateNested()
  @Type(() => Features)
  features: Features;

  @IsOptional()
  @IsDateString()
  valid_till: Date;
}
