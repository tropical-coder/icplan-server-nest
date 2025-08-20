import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class UpdateCommunicationRRule {
  @IsNotEmpty()
  @IsString()
  @Length(1, 512)
  rrule: string;
}
