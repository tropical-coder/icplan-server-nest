import {
  Get,
  Post,
  Put,
  Delete,
  JsonController,
  CurrentUser,
  Res,
  Body,
  Param,
  QueryParams,
} from "routing-controllers";

import { SavedFilterService } from "../../../app/service/saved_filter/SavedFilterService";
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Response } from "express";
import { CreateSavedFilterRequest, GetSavedFiltersRequest, RenameSavedFilterRequest, UpdateSavedFilterRequest } from "./SavedFilterRequest";
import { Authorized } from "../../../app/decorator/Authorized";

@ApiTags()
@Controller()
export class SavedFilterController {
  constructor(private savedFilterService: SavedFilterService) {}

  @Authorized()
  @Get("/saved-filter")
  async GetSavedFilters(
    @Query() query: GetSavedFiltersRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const savedFilters = await this.savedFilterService.GetSavedFilters(
      query,
      user
    );
    return savedFilters;
  }

  
  @Authorized()
  @Get("/saved-filter/:savedFilterId([0-9]+)")
  async GetSavedFilterById(
    @Param("savedFilterId") savedFilterId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const savedFilter = await this.savedFilterService.GetSavedFilterById(
      savedFilterId,
      user,
    );

    return savedFilter;
  }

  @Authorized()
  @Post("/saved-filter")
  async CreateSavedFilter(
    @Body() data: CreateSavedFilterRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const savedFilter = await this.savedFilterService.CreateSavedFilter(
      data,
      user,
    );

    return savedFilter;
  }

  @Authorized()
  @Put("/saved-filter/:savedFilterId([0-9]+)/rename")
  async RenameSavedFilter(
    @Param("savedFilterId") savedFilterId: number,
    @Body() data: RenameSavedFilterRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const savedFilter = await this.savedFilterService.RenameSavedFilter(
      savedFilterId,
      data,
      user,
    );

    return savedFilter;
  }

  @Authorized()
  @Put("/saved-filter/:savedFilterId([0-9]+)/pin")
  async PinSavedFilter(
    @Param("savedFilterId") savedFilterId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const savedFilter = await this.savedFilterService.PinSavedFilter(
      savedFilterId,
      user,
    );
    return savedFilter;
  }

  @Authorized()
  @Delete("/saved-filter/:savedFilterId([0-9]+)")
  async DeleteSavedFilter(
    @Param("savedFilterId") savedFilterId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.savedFilterService.DeleteSavedFilter(savedFilterId, user);
    return true;
  }

  @Authorized()
  @Put("/saved-filter/:savedFilterId([0-9]+)")
  async UpdateSavedFilter(
    @Param("savedFilterId") savedFilterId: number,
    @Body() data: UpdateSavedFilterRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const savedFilter = await this.savedFilterService.UpdateSavedFilter(
      savedFilterId,
      data.filters,
      user,
    );

    return savedFilter;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/saved-filter/company")
  async CreateCompanySavedFilter(
    @Body() data: CreateSavedFilterRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const savedFilter = await this.savedFilterService.CreateCompanySavedFilter(
      data,
      user,
    );

    return savedFilter;
  }
}
