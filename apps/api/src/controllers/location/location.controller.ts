
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import {
  CreateLocationRequest,
  UpdateLocationRequest,
  LocationSearchRequest,
  UpdateLocationsRequest,
  CreateSubLocationRequest,
  GetLocationRequest,
  DeleteLocationRequest,
} from "./LocationRequest";
import { LocationService } from "../../../app/service/location/LocationService";
import {
  Body,
  Post,
  Get,
  Req,
  Res,
  JsonController,
  QueryParams,
  CurrentUser,
  Put,
  Param,
  Delete,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";

@ApiTags()
@Controller()
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/location")
  async CreateLocation(
    @Body() data: CreateLocationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const createdLocation = await this.locationService.CreateLocation(
      data,
      user,
      subdomain
    );
    return createdLocation;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/location/sub/:parentLocationId")
  async CreateSubLocation(
    @Body() data: CreateSubLocationRequest,
    @Param("parentLocationId") parentLocationId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const createdLocation = await this.locationService.CreateSubLocation(
      data,
      parentLocationId,
      user,
      subdomain
    );
    return createdLocation;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/location/:locationId")
  async UpdateLocation(
    @Param("locationId") locationId: number,
    @Body() data: UpdateLocationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const updatedLocation = await this.locationService.UpdateLocation(
      locationId,
      data,
      user,
      subdomain
    );
    return updatedLocation;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/location/:locationId")
  async DeleteLocation(
    @Param("locationId") locationId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.locationService.DeleteLocation([locationId], user);
    return null;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/location")
  async UpdateLocations(
    @Body() data: UpdateLocationsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedLocation = await this.locationService.UpdateLocations(data);
    return updatedLocation;
  }

  @Authorized()
  @Get("/location")
  async GetLocations(
    @Query() data: GetLocationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.locationService.GetLocations(data, user);
    return users;
  }

  @Authorized()
  @Get("/location/search")
  async SearchLocation(
    @Query() locationSearchRequest: LocationSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const locations = await this.locationService.SearchLocations(
      locationSearchRequest,
      user
    );
    return locations;
  }

  @Authorized()
  @Get("/location/search/flat")
  async SearchFlatLocation(
    @Query() locationSearchRequest: LocationSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const locations = await this.locationService.SearchFlatLocations(
      locationSearchRequest,
      user
    );
    return locations;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/location")
  async DeleteLocations(
    @Query() params: DeleteLocationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.locationService.DeleteLocation(
      params.location_ids, 
      user
    );
    return true;
  }
}
