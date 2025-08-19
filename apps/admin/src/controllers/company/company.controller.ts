import express from 'express';
import { Authorized } from '@app/common/decorators/authorized.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateCompanyByAdminRequest,
  CreateSubdomainRequest,
  GetCompaniesRequest,
  MfaEnabledCompaniesRequest,
  SsoCredentialsRequest,
  UpdateCompanyInfoRequest,
  UpdatePOPSubtitlesRequest,
} from '@app/company/dtos/company.dto';
import { GetMulterObj } from '@app/common/helpers/media.helper';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Company')
@Controller()
export class CompanyController {
  constructor(private companyService: any) {}

  @Authorized()
  @Get('/companys')
  async GetCompanies(@Query() params: GetCompaniesRequest) {
    const companies = await this.companyService.GetAllCompanies(params);
    return companies;
  }

  @Authorized()
  @Get('/company/:companyId([0-9]+)')
  async GetCompanyById(@Param('companyId') companyId: number) {
    const companies = await this.companyService.GetCompanyDetails(companyId);
    return companies;
  }

  @Authorized()
  @Post('/company')
  async CreateCompany(@Body() data: CreateCompanyByAdminRequest) {
    const company = await this.companyService.CreateCompanyByAdmin(data);
    return company;
  }

  @Authorized()
  @Put('/company/:companyId([0-9]+)')
  async UpdateCompanyInfo(
    @Param('companyId') companyId: number,
    @Body() data: UpdateCompanyInfoRequest,
  ) {
    const company = await this.companyService.UpdateCompanyInfo(
      companyId,
      data,
    );
    return company;
  }

  @Authorized()
  @Delete('/company/:companyId([0-9]+)')
  async SoftDeleteCompany(@Param('companyId') companyId: number) {
    const company = await this.companyService.SoftDeleteCompany(companyId);
    return company;
  }

  @ApiOperation({
    deprecated: true,
    description:
      'Use PUT /api/company/{companyId} with is_active=true in payload',
  })
  @Authorized()
  @Put('/company/re-activate/:companyId([0-9]+)')
  async ReActivateCompany(@Param('companyId') companyId: number) {
    const company = await this.companyService.ReActivateCompany(companyId);
    return company;
  }

  @Authorized()
  @Get('/company/allowed-mfa')
  async GetAllowedMfaCompany(@Query() params: MfaEnabledCompaniesRequest) {
    const companies = await this.companyService.GetAllowedMfaCompany(
      params.company_id,
    );
    return companies;
  }

  @Authorized()
  @Get('/company/get-all-allowed-mfa')
  async GetAllowedMfaCompanies() {
    const companies = await this.companyService.GetAllowedMfaCompanies();
    return companies;
  }

  @Authorized()
  @Post('/company/allow-mfa')
  async AllowMfaToCompany(@Body() data: MfaEnabledCompaniesRequest) {
    const company = await this.companyService.AllowMfaToCompany(
      data.company_id,
    );
    return company;
  }

  @Authorized()
  @Delete('/company/delete-mfa-allowed')
  async DeleteAllowedMfaCompany(@Query() params: MfaEnabledCompaniesRequest) {
    const company = await this.companyService.DeleteAllowedMfaCompany(
      params.company_id,
    );
    return company;
  }

  @Authorized()
  @UseInterceptors(FileInterceptor('certificate', GetMulterObj()))
  @Post('/company/:companyId([0-9]+)/upload-sso-credentials')
  async UploadSsoCredentials(
    @Param('companyId') companyId: number,
    @Body() data: SsoCredentialsRequest,
    @UploadedFile() certificate: Express.Multer.File,
  ) {
    const company = await this.companyService.SetSsoCredentials(
      companyId,
      data,
      certificate,
    );
    return company;
  }

  @ApiOperation({
    deprecated: true,
    description: 'Use POST /api/company/:companyId/upload-sso-credentials instead'
  })
  @Authorized()
  @UseInterceptors(FileInterceptor('certificate', GetMulterObj()))
  @Post('/company/:companyId([0-9]+)/upload-sso-certificate')
  async UploadSsoCertificate(
    @Param('companyId') companyId: number,
    @UploadedFile() certificate: Express.Multer.File,
  ) {
    const company = await this.companyService.UploadSsoCertificate(
      companyId,
      certificate,
    );
    return company;
  }

  @Authorized()
  @Post('/company/:companyId([0-9]+)/subdomain')
  async CreateSubdomain(
    @Param('companyId') companyId: number,
    @Body() data: CreateSubdomainRequest,
  ) {
    const subdomains: string[] = await this.companyService.CreateSubdomain(
      companyId,
      data,
    );
    return subdomains;
  }

  @Authorized()
  @Put('/company/:companyId([0-9]+)/subdomain')
  async DeleteSubdomain(
    @Param('companyId') companyId: number,
    @Body() data: CreateSubdomainRequest,
  ) {
    const subdomains: string[] = await this.companyService.DeleteSubdomain(
      companyId,
      data,
    );
    return subdomains;
  }

  @Authorized()
  @Get('/company/:companyId([0-9]+)/export')
  async ExportCompanyData(
    @Param('companyId') companyId: number,
    @Res() res: express.Response,
  ) {
    const companyExcelBuffer =
      await this.companyService.ExportCompanyData(companyId);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${Date.now()}_${companyId}_activity.xlsx`
    );
    return companyExcelBuffer;
  }

  @Authorized()
  @Put('/company/:companyId([0-9]+)/pop-subtitles')
  async UpdatePOPSubtitles(
    @Param('companyId') companyId: number,
    @Body() data: UpdatePOPSubtitlesRequest,
  ) {
    const cul = await this.companyService.UpdatePOPSubtitles(data, companyId);
    return cul;
  }
}
