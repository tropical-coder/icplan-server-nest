import {
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Param,
} from "routing-controllers";

import { BusinessAreaService } from "../../../app/service/business_area/BusinessAreaService";
import { Response } from "express";
import { IRedisAdminModel } from "../../../app/model/admin/AdminModel";
import { Authorized } from "../../../app/decorator/Authorized";
import { GetBusinessAreasRequest } from "./BusinessAreaRequest";

@ApiTags()
@Controller()
export class BusinessAreaController {
  constructor(private businessAreaService: BusinessAreaService) {}

  @Authorized()
  @Get("/company/:companyId([0-9]+)/business-area")
  async GetBusinessAreas(
    @Param("companyId") companyId: number,
    @Query() data: GetBusinessAreasRequest,
    @CurrentUser()
    user: IRedisAdminModel,
    @Res() res: Response
  ) {
    const businessAreas = await this.businessAreaService.GetBusinessAreas(
      data,
      companyId
    );
    return businessAreas;
  }
}
