import {
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
  IsOptional,
  IsString,
  IsBoolean,
  Length,
} from "class-validator";
import { PaginationParam } from "@app/common/base/base.dto";

export class ValidatePhoneNumberRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class LoginAdminRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @Length(4)
  @IsNotEmpty()
  verification_code: string;
}

export class GetAdminRequest extends PaginationParam {
  @IsOptional()
  is_active: string;

  @IsOptional()
  @IsString()
  name: string;
}

export class AddAdminRequest {
  @IsString()
  full_name: string;

  @IsString()
  country_code: string;

  @IsString()
  phone_number: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(12)
  @Matches(
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%^&(){}[\]:;<>,?~_+-=|]).{12,}$/i,
    {
      message:
        "Password must be at least 12 characters long and must contain number, uppercase character and a special case.",
    }
  )
  password: string;

  @IsBoolean()
  is_active: boolean;
}

export class UpdateAdminRequest {
  @IsString()
  full_name: string;

  @IsString()
  country_code: string;

  @IsString()
  phone_number: string;

  @IsOptional()
  @MinLength(12)
  @Matches(
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%^&(){}[\]:;<>,?~_+-=|]).{12,}$/i,
    {
      message:
        "Password must be at least 12 characters long and must contain number, uppercase character and a special case.",
    }
  )
  password: string;

  @IsBoolean()
  is_active: boolean;
}
