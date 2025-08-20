
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import {
  AddBasicConfigurationRequest,
  UpdateCompanyRequest,
} from "./CompanyRequest";
import { CompanyService } from "../../../app/service/company/CompanyService";
import {
  Body,
  Get,
  Res,
  JsonController,
  CurrentUser,
  Put,
  Post,
  UploadedFile,
  Req,
  QueryParam,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { GetMulterObj } from "../../../app/service/aws/MediaService";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";
import { ImageMimeTypes } from "../../../app/service/aws/ImageMimeTypes";

@ApiTags()
@Controller()
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/company")
  async UpdateCompany(
    @Body() data: UpdateCompanyRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedCompany = await this.companyService.UpdateCompany(
      user.company_id,
      data
    );
    return updatedCompany;
  }

  @Authorized()
  @Get("/company")
  async GetCompanyInfo(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.companyService.GetCompany(user.company_id);
    return users;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/company/image")
  async UploadCompanyImage(
    @UploadedFile("image", {
      required: true,
      options: GetMulterObj(ImageMimeTypes),
    })
    image,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const img = await this.companyService.UploadCompanyImage(user, image);
    return img;
  }

  @Get("/subdomain")
  async GetSubDomain(
    @Req() req: Request,
    @Res() res: Response,
    @QueryParam("redirect_url") redirect_url?: string, // will be returned back in /cognito-login
  ) {
    const subDomain = await this.companyService.getSubDomain(req.subdomains, redirect_url);
    return subDomain;
  }

  @Authorized(UserRoles.Owner)
  @Post("/company/basic-configuration")
  async AddBasicConfiguration(
    @Body() data: AddBasicConfigurationRequest,
    @Res() res: Response,
    @CurrentUser()
    user: IRedisUserModel
  ) {
    const company = await this.companyService.AddBasicConfiguration(data, user);
    return company;
  }
}
