import {
  Body,
  JsonController,
  Post,
  Res,
  Get,
  Param,
  QueryParams,
  Delete,
} from "routing-controllers";

import { QuickBookService } from "../../../app/service/quick_book/QuickBookService";
import {
  CreateCustomerInvoice,
  CreateQuickBookCustomer,
  GetAllCustomersRequest,
  GetAllInvoicesRequest,
  SendInvoicesRequest,
} from "./QuickBookRequest";
import { Request, Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";

@ApiTags()
@Controller()
export class QuickBookController {
  constructor(private quickBookService: QuickBookService) {}

  @Post("/quickbook/customer")
  async CreateQuickBookCustomer(
    @Body() data: CreateQuickBookCustomer,
    @Res() res: Response
  ) {
    const customer = await this.quickBookService.CreateCustomer(data);
    return customer;
  }

  @Post("/quickbook/invoice")
  async CreateCustomerInvoice(
    @Body() data: CreateCustomerInvoice,
    @Res() res: Response
  ) {
    const invoice = await this.quickBookService.CreateInvoice(data);
    return invoice;
  }

  @Get("/quickbook/customers")
  async GetAllCustomers(
    @Query() params: GetAllCustomersRequest,
    @Res() res: Response
  ) {
    const invoice = await this.quickBookService.GetCustomers(params);
    return invoice;
  }

  @Get("/quickbook/send-invoice")
  async SendCustomerInvoice(
    @Query() params: SendInvoicesRequest,
    @Res() res: Response
  ) {
    const invoice = await this.quickBookService.SendCustomerInvoice(params);
    return invoice;
  }

  @Get("/quickbook/invoice/:invoiceId")
  async GetInvoicePDF(
    @Param("invoiceId") invoiceId: number,
    @Res() res: Response
  ) {
    const invoice = await this.quickBookService.GetInvoicePDF(invoiceId);
    return invoice;
  }

  @Get("/quickbook/invoices/:customerId")
  async GetCustomerInvoices(
    @Param("customerId") customerId: number,
    @Query() params: GetAllInvoicesRequest,
    @Res() res: Response
  ) {
    const invoice = await this.quickBookService.GetCustomerInvoices(
      customerId,
      params
    );
    return invoice;
  }

  @Delete("/quickbook/invoice/:invoiceId")
  async DeleteCustomerInvoices(
    @Param("invoiceId") invoiceId: number,
    @Res() res: Response
  ) {
    const invoice = await this.quickBookService.DeleteCustomerInvoice(
      invoiceId
    );
    return invoice;
  }
}
