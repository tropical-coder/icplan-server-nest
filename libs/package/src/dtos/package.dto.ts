import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  ArrayMaxSize,
  MaxLength,
  MinLength,
  Max,
} from "class-validator";
import { RecurringInterval } from "../../../app/model/package/PackagePriceModel";
import { KeyMessaging } from "../subscription/SubscriptionRequest";

export class CreatePackageRequest {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  subtitle: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description: string;

  @IsOptional()
  @IsString()
  tag: string;

  @IsBoolean()
  active: boolean;

  @IsOptional()
  @IsInt()
  expiry_in_seconds: number;

  @IsOptional()
  @IsInt()
  trial_extension_seconds: number;

  @IsBoolean()
  analytics: boolean;

  @IsBoolean()
  advanced_analytics: boolean;

  @IsBoolean()
  branding: boolean;

  @IsBoolean()
  reporting: boolean;

  @IsBoolean()
  sso: boolean;

  @IsBoolean()
  subdomain: boolean;

  @IsBoolean()
  yammer: boolean;

  @IsBoolean()
  teams: boolean;

  @IsBoolean()
  comment: boolean;

  @IsEnum(KeyMessaging)
  key_messaging: KeyMessaging;

  @IsOptional()
  @IsInt()
  @Max(2147483647)
  readonly_user_limit: number;

  @IsInt()
  @Max(2147483647)
  plan_limit: number;

  @IsInt()
  @Max(2147483647)
  communication_limit: number;

  @IsInt()
  @Max(2147483647)
  task_limit: number;

  @IsInt()
  @Max(2147483647)
  business_area_limit: number;

  @IsInt()
  @Max(2147483647)
  channel_limit: number;

  @IsInt()
  @Max(2147483647)
  audience_limit: number;

  @IsInt()
  @Max(2147483647)
  strategic_priority_limit: number;

  @IsInt()
  @Max(2147483647)
  location_limit: number;

  @ArrayMaxSize(15) // from stripe
  @IsString({ each: true })
  @MaxLength(80, { each: true }) // from stripe
  marketing_features: string[];

  @IsBoolean()
  is_beta: boolean;

  @IsBoolean()
  is_highlighted: boolean;

  @IsBoolean()
  is_default: boolean;
}

export class CreatePackagePriceRequest {
  @IsNumber({ maxDecimalPlaces: 2 })
  value: number;

  @IsEnum(RecurringInterval)
  interval: RecurringInterval;

  @IsBoolean()
  active: boolean;
}

export class UpdatePackagePriceRequest {
  @IsBoolean()
  active: boolean;
}
