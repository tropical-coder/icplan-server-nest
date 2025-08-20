import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class PostYammerMessageRequest {
  @IsOptional()
  body: string;

  @IsNotEmpty()
  communication_id: number;

  @IsNotEmpty()
  status: string;

  @IsOptional()
  Id: number;

  @IsOptional()
  attachment_id: number;

  @IsOptional()
  schedule_time: Date;

  @IsOptional()
  group_id: number;
}

export class YammerAccesstokenRequest {
  @IsNotEmpty() token: string;
  @IsNotEmpty() social_network_type: string;
}

export class UpdateDraftMessageRequest {
  @IsNotEmpty()
  Id: number;

  @IsOptional()
  body: string;

  @IsOptional()
  attachment_url: string;

  @IsOptional()
  schedule_time: Date;

  @IsOptional()
  group_id: number;
}

export class GetYammerImageRequest {
  @IsString()
  image_url: string;
}
