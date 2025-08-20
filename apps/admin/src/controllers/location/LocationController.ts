
import { Response } from "express";
import { LocationService } from "../../../app/service/location/LocationService";
import {
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Param,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { IRedisAdminModel } from "../../../app/model/admin/AdminModel";
import { GetLocationRequest } from "./LocationRequest";

@ApiTags()
@Controller()
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Authorized()
  @Get("/company/:companyId([0-9]+)/location")
  async GetLocations(
    @Param("companyId") companyId: number,
    @Query() data: GetLocationRequest,
    @CurrentUser()
    user: IRedisAdminModel,
    @Res() res: Response
  ) {
    const locations = await this.locationService.GetLocations(data, {
      ...user,
      company_id: companyId,
    });
    return locations;
  }
}
