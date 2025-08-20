import { IsNotEmpty, IsString, IsOptional, MaxLength, IsEnum, IsInt } from "class-validator";
import { NotificationRuleEntity } from "../../../app/model/notification/NotificationRuleModel";

export class BroadcastNotificationRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  body: string;
}

export class CreateNotificationRuleRequest {
  @IsEnum(NotificationRuleEntity)
  entity: NotificationRuleEntity;

  @IsInt()
  entity_id: number;
}