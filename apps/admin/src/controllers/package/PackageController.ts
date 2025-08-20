import { Body, CurrentUser, Get, JsonController, Param, Post, Put, QueryParams, Res, UploadedFile } from "routing-controllers";

import { Response } from "express";
import { PackageService } from "../../../app/service/package/PackageService";
import { Authorized } from "../../../app/decorator/Authorized";
import { PaginationParam } from "../../../app/controller/base/BaseRequest";
import { CreatePackagePriceRequest, CreatePackageRequest, UpdatePackagePriceRequest } from "./PackageRequest";
import { IRedisAdminModel } from "../../../app/model/admin/AdminModel";
import { GetMulterObj } from "../../../app/service/aws/MediaService";
import { ImageMimeTypes } from "../../../app/service/aws/ImageMimeTypes";

@ApiTags()
@Controller()
export class PackageController {
  constructor(private packageService: PackageService) {}

  @Authorized()
  @Get("/package")
  async GetPackages(@Query() params: PaginationParam, @Res() res: Response) {
    const packages = await this.packageService.GetPackages(params, true);
    return packages;
  }

  @Authorized()
  @Get("/package/:packageId([0-9]+)")
  async GetPackageById(@Param("packageId") packageId: number, @Res() res: Response) {
    const packageModel = await this.packageService.GetPackageById(packageId, true);
    return packageModel;
  }

  @Authorized()
  @Post("/package")
  async CreatePackage(
    @Body() data: CreatePackageRequest,
    @CurrentUser()
    admin: IRedisAdminModel,
    @Res() res: Response,
  ) {
    const createdPackage = await this.packageService.CreatePackage(data, admin);
    return createdPackage;
  }

  @Authorized()
  @Put("/package/:packageId([0-9]+)")
  async UpdatePackage(
    @Param("packageId") packageId: number,
    @Body() data: CreatePackageRequest,
    @Res() res: Response,
  ) {
    const updatePackage = await this.packageService.UpdatePackage(data, packageId);
    return updatePackage;
  }

  @Authorized()
  @Post("/package/:packageId([0-9]+)/icon")
  async UploadPackageIcon(
    @Param("packageId") packageId: number,
    @UploadedFile("icon", {
      required: true,
      options: GetMulterObj(ImageMimeTypes),
    })
    icon,
    @Res() res: Response
  ) {
    const img = await this.packageService.UploadPackageIcon(packageId, icon);
    return img;
  }

  @Authorized()
  @Post("/package/:packageId([0-9]+)/price")
  async AddPackagePrice(
    @Param("packageId") packageId: number,
    @CurrentUser() admin: IRedisAdminModel,
    @Body() data: CreatePackagePriceRequest,
    @Res() res: Response,
  ) {
    const packagePrice = await this.packageService.AddPackagePrice(data, packageId, admin);
    return packagePrice;
  }

  @Authorized()
  @Put("/package/:packageId([0-9]+)/price/:priceId([0-9]+)")
  async UpdatePackagePrice(
    @Param("packageId") _: number,
    @Param("priceId") priceId: number,
    @Body() data: UpdatePackagePriceRequest,
    @Res() res: Response,
  ) {
    const packagePrice = await this.packageService.UpdatePackagePrice(data, priceId);
    return packagePrice;
  }
}