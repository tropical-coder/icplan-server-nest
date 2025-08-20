
import { Request, Response } from "express";
import {
  GetCompaniesRequest,
  CreateCompanyByAdminRequest,
  UpdateCompanyInfoRequest,
  MfaEnabledCompaniesRequest,
  SsoCredentialsRequest,
  CreateSubdomainRequest,
  UpdatePOPSubtitlesRequest,
} from "./CompanyRequest";
import { CompanyService } from "../../../app/service/company/CompanyService";
import {
  Body,
  Res,
  JsonController,
  CurrentUser,
  Get,
  QueryParams,
  Param,
  Post,
  Req,
  Put,
  Delete,
  UploadedFile,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { IRedisAdminModel } from "../../../app/model/admin/AdminModel";
import { GetMulterObj } from "../../../app/service/aws/MediaService";
import { OpenAPI } from "routing-controllers-openapi";

@ApiTags()
@Controller()
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Authorized()
  @Get("/companys")
  async GetCompanies(
    @Query() params: GetCompaniesRequest,
    @Res() res: Response
  ) {
    const companies = await this.companyService.GetAllCompanies(params);
    return companies;
  }

  @Authorized()
  @Get("/company/:companyId([0-9]+)")
  async GetCompanyById(
    @Param("companyId") companyId: number,
    @Res() res: Response
  ) {
    const companies = await this.companyService.GetCompanyDetails(companyId);
    return companies;
  }

  @Authorized()
  @Post("/company")
  async CreateCompany(
    @Body() data: CreateCompanyByAdminRequest,
    @Res() res: Response
  ) {
    const company = await this.companyService.CreateCompanyByAdmin(data);
    return company;
  }

  @Authorized()
  @Put("/company/:companyId([0-9]+)")
  async UpdateCompanyInfo(
    @Param("companyId") companyId: number,
    @Body() data: UpdateCompanyInfoRequest,
    @Res() res: Response
  ) {
    const company = await this.companyService.UpdateCompanyInfo(
      companyId,
      data
    );
    return company;
  }

  @Authorized()
  @Delete("/company/:companyId([0-9]+)")
  async SoftDeleteCompany(
    @Param("companyId") companyId: number,
    @Res() res: Response
  ) {
    const company = await this.companyService.SoftDeleteCompany(companyId);
    return company;
  }

  @OpenAPI({
    deprecated: true,
    description: "Use PUT /api/company/{companyId} with is_active=true in payload"
  })
  @Authorized()
  @Put("/company/re-activate/:companyId([0-9]+)")
  async ReActivateCompany(
    @Param("companyId") companyId: number,
    @Res() res: Response
  ) {
    const company = await this.companyService.ReActivateCompany(companyId);
    return company;
  }

  @Authorized()
  @Get("/company/allowed-mfa")
  async GetAllowedMfaCompany(
    @Query() params: MfaEnabledCompaniesRequest,
    @CurrentUser()
    @Res()
    res: Response
  ) {
    const companies = await this.companyService.GetAllowedMfaCompany(
      params.company_id
    );
    return companies;
  }

  @Authorized()
  @Get("/company/get-all-allowed-mfa")
  async GetAllowedMfaCompanies(
    @CurrentUser()
    @Res()
    res: Response
  ) {
    const companies = await this.companyService.GetAllowedMfaCompanies();
    return companies;
  }

  @Authorized()
  @Post("/company/allow-mfa")
  async AllowMfaToCompany(
    @Body() data: MfaEnabledCompaniesRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const company = await this.companyService.AllowMfaToCompany(
      data.company_id
    );
    return company;
  }

  @Authorized()
  @Delete("/company/delete-mfa-allowed")
  async DeleteAllowedMfaCompany(
    @Query() params: MfaEnabledCompaniesRequest,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const company = await this.companyService.DeleteAllowedMfaCompany(
      params.company_id
    );
    return company;
  }

  @Authorized()
  @Post("/company/:companyId([0-9]+)/upload-sso-credentials")
  async UploadSsoCredentials(
    @Param("companyId") companyId: number,
    @UploadedFile("certificate", { required: false, options: GetMulterObj() })
    certificate: any,
    @Body() data: SsoCredentialsRequest,
    @Res() res: Response
  ) {
    const company = await this.companyService.SetSsoCredentials(
      companyId,
      data,
      certificate,
    );
    return company;
  }

  /**
   * Deprecated
   */
  @Authorized()
  @Post("/company/:companyId([0-9]+)/upload-sso-certificate")
  async UploadSsoCertificate(
    @Param("companyId") companyId: number,
    @UploadedFile("certificate", { required: true, options: GetMulterObj() })
    certificate: any,
    @Res() res: Response
  ) {
    const company = await this.companyService.UploadSsoCertificate(
      companyId,
      certificate
    );
    return company;
  }

  @Authorized()
  @Post("/company/:companyId([0-9]+)/subdomain")
  async CreateSubdomain(
    @Param("companyId") companyId: number,
    @Body() data: CreateSubdomainRequest,
    @Res() res: Response,
  ) {
    const subdomains: string[] = await this.companyService.CreateSubdomain(
      companyId,
      data
    );
    return subdomains;
  }

  @Authorized()
  @Put("/company/:companyId([0-9]+)/subdomain")
  async DeleteSubdomain(
    @Param("companyId") companyId: number,
    @Body() data: CreateSubdomainRequest,
    @Res() res: Response,
  ) {
    const subdomains: string[] = await this.companyService.DeleteSubdomain(
      companyId,
      data
    );
    return subdomains;
  }

  @Authorized()
  @Get("/company/:companyId([0-9]+)/export")
  async ExportCompanyData(
    @Param("companyId") companyId: number,
    @Res() res: Response
  ) {
    const companyExcelBuffer = await this.companyService.ExportCompanyData(companyId);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${Date.now()}_${companyId}_activity.xlsx`
    );
    return res.send(companyExcelBuffer);
  }

  @Authorized()
  @Put("/company/:companyId([0-9]+)/pop-subtitles")
  async UpdatePOPSubtitles(
    @Param("companyId") companyId: number,
    @Body() data: UpdatePOPSubtitlesRequest,
    @Res() res: Response
  ) {
    const cul = await this.companyService.UpdatePOPSubtitles(data, companyId);
    return cul;
  }
}
