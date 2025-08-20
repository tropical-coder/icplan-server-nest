import {
  Length,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  Matches,
  IsObject,
} from "class-validator";
import { UserRoles } from "../../../app/model/user/UserModel";
import { Type } from "class-transformer";
import { UserPermission } from "../../../app/model/user/business_area_permission/UserBusinessAreaPermissionModel";
import { OrderDirectionRequest, PaginationParam } from "../../../app/controller/base/BaseRequest";
import { GetPlanRequest, PlanOrderColumnRequest } from "../plan/PlanRequest";
import { DefaultTab } from "../../../app/model/user/UserSettingModel";

export class BusinessAreaPermission {
  @IsEnum(UserPermission) permission: UserPermission;

  @IsNumber() business_area_id: number;

  @IsBoolean() is_primary: boolean;
}

export class DefaultSort {
  @IsEnum(PlanOrderColumnRequest)
  column: PlanOrderColumnRequest;
  
  @IsEnum(OrderDirectionRequest)
  direction: OrderDirectionRequest;
}

export class AddUserRequest {
  @IsNotEmpty()
  // @IsEmail()
  @Matches(
    /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i,
    {
      message: "Invalid Email.",
    }
  )
  email: string;

  @Length(1, 255)
  @IsNotEmpty()
  @Matches(/^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/, {
    message: "Invalid full name"
  })
  full_name: string;

  @IsOptional()
  @IsEnum(UserRoles)
  role: UserRoles;

  @IsOptional()
  @IsArray()
  locations: number[];

  @IsOptional()
  @IsArray()
  tags: number[];

  @IsOptional()
  @IsArray()
  skills: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessAreaPermission)
  business_areas: BusinessAreaPermission[];
}

export class UpdateUserRequest {
  @IsNotEmpty()
  @Matches(
    /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i,
    {
      message: "Invalid Email.",
    }
  )
  email: string;

  @Length(1, 255)
  @IsNotEmpty()
  @Matches(/^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/, {
    message: "Invalid full name"
  })
  full_name: string;

  @IsOptional()
  @IsEnum(UserRoles)
  role: UserRoles;

  @IsOptional()
  @IsArray()
  locations: number[];

  @IsOptional()
  @IsArray()
  tags: number[];

  @IsOptional()
  @IsArray()
  skills: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessAreaPermission)
  business_areas: BusinessAreaPermission[];
}

export class UpdateLoggedInUserRequest {
  @Length(1, 255)
  @IsOptional()
  @Matches(/^[A-Za-z]+\.?(?:[ '-][A-Za-z]+\.?)*$/, {
    message: "Invalid full name"
  })
  full_name: string;

  @IsOptional()
  @IsBoolean()
  receive_email_notification: boolean;

  @IsOptional()
  @IsBoolean()
  status_change_notification: boolean;

  @IsOptional()
  @IsBoolean()
  assignment_notification: boolean;

  @IsOptional()
  @IsBoolean()
  start_date_notification: boolean;

  @IsOptional()
  @IsEnum(DefaultTab)
  default_tab: DefaultTab;

  @IsOptional()
  @IsInt()
  default_color_id: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DefaultSort)
  default_sort: DefaultSort;

  @IsOptional()
  @IsBoolean()
  show_phases: boolean;

  @IsOptional()
  @IsObject()
  advanced_analytics_layout: Record<string, any>;
}

export class UpdateUserFiltersRequest {
  @IsOptional()
  @ValidateNested({ each: false })
  @Type(() => GetPlanRequest)
  planAndCommunication: GetPlanRequest;

  @IsOptional()
  @ValidateNested({ each: false })
  @Type(() => GetPlanRequest)
  analytics: GetPlanRequest;

  @IsOptional()
  @ValidateNested({ each: false })
  @Type(() => GetPlanRequest)
  calendar: GetPlanRequest;

  @IsOptional()
  @ValidateNested({ each: false })
  @Type(() => GetPlanRequest)
  report: GetPlanRequest;

  @IsOptional()
  @IsObject()
  task: Object;
}
export class UpdateTooltipRequest {
  @IsOptional()
  @IsBoolean()
  planAndCommunication: Boolean;

  @IsOptional()
  @IsBoolean()
  analytics: Boolean;

  @IsOptional()
  @IsBoolean()
  calendar: Boolean;

  @IsOptional()
  @IsBoolean()
  report: Boolean;

  @IsOptional()
  @IsBoolean()
  task: Boolean;
}

export class FindUserRequest {
  @IsOptional()
  @IsNumber()
  page: number;

  @IsOptional()
  @IsNumber()
  limit: number;
}

export class DeleteUserRequest {
  @IsInt()
  @Min(0)
  Id: number;
}

export class ChangePasswordRequest {
  @IsNotEmpty()
  @Matches(
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%^&(){}[\]:;<>,?~_+-=|]).{16,}$/i,
    {
      message:
        "Password must be at least 16 characters long and must contain number, uppercase character and a special case.",
    }
  )
  new_password: string;

  @IsNotEmpty()
  old_password: string;
}

export class DeleteUsersRequest {
  @IsArray() ids: number[];
}

export enum UserOrderColumnRequest {
  FullName = "full_name",
  Email = "email",
  Role = "role",
}

export enum UserOrderDirectionRequest {
  ASC = "ASC",
  DESC = "DESC",
}

export class UserSearchRequest extends PaginationParam {
  @IsOptional()
  @IsString()
  user: string;

  @IsOptional()
  @IsEnum(UserOrderColumnRequest)
  column: UserOrderColumnRequest;

  @IsOptional()
  @IsEnum(UserOrderDirectionRequest)
  direction: UserOrderDirectionRequest;

  @IsOptional()
  @IsInt()
  communication_id: number;

  @IsOptional()
  @IsArray()
  business_areas: number[];

  @IsOptional()
  @IsEnum(UserPermission, { each: true })
  business_area_permission: UserPermission[];

  @IsOptional()
  @IsArray()
  roles: number[];

  @IsOptional()
  @IsBoolean()
  is_deleted: boolean;
}

export class SetPasswordRequest {
  @IsNotEmpty()
  @Matches(
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[*.!@$%^&(){}[\]:;<>,?~_+-=|]).{16,}$/i,
    {
      message:
        "Password must be at least 16 characters long and must contain number, uppercase character and a special case.",
    }
  )
  password: string;

  @IsBoolean() t_and_c_accepted: boolean;

  @IsBoolean() subscribe_newsletter: boolean;

  @IsBoolean() subscribe_announcement: boolean;
}

export class UserBusinessAreasSearchRequest {
  @IsOptional()
  @IsString()
  business_area: string;

  @IsOptional()
  @IsEnum(UserPermission, { each: true })
  business_area_permission: UserPermission[];
}

export class ConfigureMfa {
  @IsBoolean()
  @IsNotEmpty()
  is_mfa_enabled: boolean;
}

export class VerifyMfaConfiguration {
  @IsNotEmpty()
  code: number;
}

export class MfaDetails {
  @IsNotEmpty()
  qr_code: string;

  @IsNotEmpty()
  secret: string;
}
