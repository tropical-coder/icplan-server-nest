import { CurrentUser, Get, JsonController, Param, QueryParams, Req, Res } from "routing-controllers";

import { Request, Response } from "express";
import { PackageService } from "../../../app/service/package/PackageService";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { IRedisUserModel } from "../../../app/model/user/UserModel";

@ApiTags()
@Controller()
export class PackageController {
  constructor(private packageService: PackageService) {}

  @Get("/package")
  async GetPackages(
    @CurrentUser({ required: false }) user: IRedisUserModel,
    @Query() params: PaginationParam,
    @Res() res: Response
  ) {
    const packages = await this.packageService.GetPackages(params, false, user);
    return packages;
  }

  @Get("/package/:packageId([0-9]+)")
  async GetPackageById(
    @Param("packageId") packageId: number,
    @Res() res: Response
  ) {
    const packageModel = await this.packageService.GetPackageById(packageId, false);
    return packageModel;
  }

  @Get("/price/:priceId([0-9]+)")
  async GetPriceById(
    @Param("priceId") priceId: number,
    @Res() res: Response
  ) {
    const priceModel = await this.packageService.GetPackagePriceById(priceId);
    return priceModel;
  }

  @Get("/promotion-code/:code/validate")
  async ValidatePromotionCode(
    @Param("code") code: string,
    @Res() res: Response
  ) {
    const data = await this.packageService.ValidatePromotionCode(code);
    return data;
  }
}