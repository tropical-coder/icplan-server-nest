import { IsEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";

export class CreateQuickBookCustomer {
  @IsString() DisplayName: string;
}

export class CreateCustomerInvoice {
  @IsNumber() unit_count: number;
  @IsNumber() unit_amount: number;
  @IsNumber() discount_amount: number;
  @IsString() company_Id: string;
}

export class GetAllCustomersRequest extends PaginationParam {
  @IsOptional()
  name: string;

  @IsOptional()
  customer_Id: string;
}

export class GetAllInvoicesRequest extends PaginationParam {
  @IsOptional()
  name: string;

  @IsOptional()
  filter_type: string;
}

export class SendInvoicesRequest {
  @IsString()
  company_email: string;

  @IsString()
  invoice_Id: string;
}
