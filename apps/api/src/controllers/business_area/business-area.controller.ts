
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import {
  CreateBusinessAreaRequest,
  UpdateBusinessAreaRequest,
  BusinessAreaSearchRequest,
  UpdateBusinessAreasRequest,
  CreateSubBusinessAreaRequest,
  DeleteBusinessAreasRequest,
  GetBusinessAreasRequest,
} from "./BusinessAreaRequest";
import { BusinessAreaService } from "../../../app/service/business_area/BusinessAreaService";
import {
  Body,
  Post,
  Get,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Put,
  Param,
  Delete,
  Req,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";

@ApiTags()
@Controller()
export class BusinessAreaController {
  constructor(private businessAreaService: BusinessAreaService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/business-area")
  async CreateBusinessArea(
    @Body() data: CreateBusinessAreaRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const createdBusinessArea =
      await this.businessAreaService.CreateBusinessArea(data, user, subdomain);
    return createdBusinessArea;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/business-area/sub/:parentBusinessAreaId")
  async CreateSubBusinessArea(
    @Body() data: CreateSubBusinessAreaRequest,
    @Param("parentBusinessAreaId") parentBusinessAreaId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const createdBusinessArea =
      await this.businessAreaService.CreateSubBusinessArea(
        data,
        parentBusinessAreaId,
        user,
        subdomain
      );
    return createdBusinessArea;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/business-area")
  async UpdateBusinessAreas(
    @Body() data: UpdateBusinessAreasRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedBusinessArea =
      await this.businessAreaService.UpdateBusinessAreas(data);
    return updatedBusinessArea;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/business-area/:businessAreaId")
  async UpdateBusinessArea(
    @Param("businessAreaId") businessAreaId: number,
    @Body() data: UpdateBusinessAreaRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const updatedBusinessArea =
      await this.businessAreaService.UpdateBusinessArea(
        businessAreaId,
        data,
        user,
        subdomain
      );
    return updatedBusinessArea;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/business-area/:businessAreaId")
  async DeleteBusinessArea(
    @Param("businessAreaId") businessAreaId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.businessAreaService.DeleteBusinessArea([businessAreaId], user);
    return null;
  }

  @Authorized()
  @Get("/business-area")
  async GetBusinessAreas(
    @Query() data: GetBusinessAreasRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const businessAreas = await this.businessAreaService.GetBusinessAreas(
      data,
      user.company_id
    );
    return businessAreas;
  }

  @Authorized()
  @Get("/business-area/search")
  async SearchBusinessArea(
    @Query() businessAreaSearchRequest: BusinessAreaSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const businessAreas = await this.businessAreaService.SearchBusinessAreas(
      businessAreaSearchRequest,
      user
    );
    return businessAreas;
  }

  @Authorized()
  @Get("/business-area/search/flat")
  async SearchFlatBusinessArea(
    @Query() businessAreaSearchRequest: BusinessAreaSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const businessAreas =
      await this.businessAreaService.SearchFlatBusinessAreas(
        businessAreaSearchRequest,
        user
      );
    return businessAreas;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/business-area")
  async DeleteBusinessAreas(
    @Query() params: DeleteBusinessAreasRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.businessAreaService.DeleteBusinessArea(
      params.business_area_ids,
      user
    );
    return true;
  }
}
