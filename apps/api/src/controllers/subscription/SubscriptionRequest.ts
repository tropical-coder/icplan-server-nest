import { IsInt, IsOptional, Min, IsString } from "class-validator";

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