import { IsString, MinLength } from "class-validator";

export class ConverseRequest {
  @IsString()
  @MinLength(1)
  system: string;

  @IsString()
  @MinLength(1)
  message: string;
}