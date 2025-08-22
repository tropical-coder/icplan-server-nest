import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { KeyMessaging } from "@app/key_messages/entities/key_messages.entity";
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

export class AdjustSeatsRequest {
  @IsInt()
  @Min(1)
  seats: number;
}

export class RenewSubscriptionRequest {
  @IsInt()
  price_id: number;
}

export class CreateCheckoutSessionRequest {
  @IsInt()
  price_id: number
};

export class PreviewSubscriptionChangeRequest {
  @IsOptional()
  @IsInt()
  price_id: number;

  @IsOptional()
  @Min(1)
  seats: number;
}

export class ChangeSubscriptionPriceRequest {
  @IsInt()
  price_id: number; // 0 for enterprise
}

export class ApplyPromoCodeRequest {
  @IsOptional()
  @IsString()
  promo_code?: string;
}