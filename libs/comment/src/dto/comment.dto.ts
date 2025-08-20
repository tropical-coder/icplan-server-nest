import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class GetCommentsRequest {
  @IsInt()
  plan_id: number;

  @IsOptional()
  @IsInt()
  communication_id?: number;

  @IsInt()
  @IsOptional()
  @IsInt()
  @Min(1)
  cursor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}


export class AddCommentRequest {
  @IsInt()
  plan_id: number;

  @IsOptional()
  @IsInt()
  communication_id?: number;

  @IsString()
  @MinLength(1)
  content: string;

  @IsInt({ each: true })
  tagged_users: number[];
}

export class UpdateCommentRequest {
  @IsString()
  @MinLength(1)
  content: string;
}