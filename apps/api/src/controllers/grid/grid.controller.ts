import { Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, Res } from "routing-controllers";

import { Authorized } from "../../../app/decorator/Authorized";
import { UserRoles, IRedisUserModel } from "../../../app/model/user/UserModel";
import { AddGridMediaContactRequest, ExportGridRequest, UpdateGridMediaContactRequest } from './GridRequest';
import { GridService } from '../../../app/service/grid/GridService';
import { Response } from "express";

@ApiTags()
@Controller()
export class GridController {
  constructor(private gridService: GridService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Get("/grid/media-contact")
  async GetGridMediaContacts(
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const gridMediaContacts = await this.gridService.GetGridMediaContacts(user);
    return gridMediaContacts;
  }


  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Post("/grid/media-contact")
  async AddGridMediaContact(
    @Body() data: AddGridMediaContactRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const gridMediaContact = await this.gridService.AddGridMediaContact(
      data,
      user,
    );
    return gridMediaContact;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Put("/grid/media-contact/:gridMediaContactId([0-9]+)")
  async UpdateGridMediaContact(
    @Param("gridMediaContactId") gridMediaContactId: number,
    @Body() data: UpdateGridMediaContactRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const gridMediaContact = await this.gridService.UpdateGridMediaContact(
      gridMediaContactId,
      data,
      user,
    );
    return gridMediaContact;
  }

  @Authorized(UserRoles.Owner, UserRoles.Admin)
  @Delete("/grid/media-contact/:gridMediaContactId([0-9]+)")
  async DeleteGridMediaContact(
    @Param("gridMediaContactId") gridMediaContactId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.gridService.DeleteGridMediaContact(
      gridMediaContactId,
      user,
    );
    return null;
  }

  @Authorized()
  @Get("/grid/export")
  async GridExcelExport(
    @Query() query: ExportGridRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const gridExcel = await this.gridService.ExportGrid(query, user);
    return gridExcel;
  }
}