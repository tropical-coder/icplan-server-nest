import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsDateString } from "class-validator";
import { IsValidDate } from "../../../app/decorator/DateValidator";
import { GridMediaLocations } from "../../../app/model/grid_media_contact/GridMediaContactModel";

export class AddGridMediaContactRequest {
  @IsNotEmpty()
  @IsInt()
  user_id: number;

  @IsOptional()
  @IsString()
  telephone: string;

  @IsNotEmpty()
  @IsEnum(GridMediaLocations)
  location: GridMediaLocations;
}

export class UpdateGridMediaContactRequest {
  @IsOptional()
  @IsInt()
  user_id: number;

  @IsOptional()
  @IsString()
  telephone: string;

  @IsOptional()
  @IsEnum(GridMediaLocations)
  location: GridMediaLocations;
}

export class ExportGridRequest {
  @IsValidDate({ message: "Invalid date format. Please use YYYY-MM-DD" })
  start_date: string;
}