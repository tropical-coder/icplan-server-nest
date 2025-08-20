
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Response } from "express";
import {
  CreateParentFolderRequest,
  UpdateParentFolderRequest,
  ParentFolderSearchRequest,
  GetParentFolderAndPlanRequest,
  PinFolderRequest,
} from "./ParentFolderRequest";
import { ParentFolderService } from "../../../app/service/parent_folder/ParentFolderService";
import {
  Body,
  Post,
  Get,
  Res,
  JsonController,
  CurrentUser,
  Put,
  Param,
  Delete,
  QueryParams,
  QueryParam,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";

@ApiTags()
@Controller()
export class ParentFolderController {
  constructor(private parentFolderService: ParentFolderService) {}

  @Authorized()
  @Post("/parent_folder")
  async CreateParentFolder(
    @Body() data: CreateParentFolderRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdParentFolder =
      await this.parentFolderService.CreateParentFolder(data, user);
    return createdParentFolder;
  }

  @Authorized()
  @Put("/parent_folder/:parentFolderId([0-9]+)")
  async UpdateParentFolder(
    @Param("parentFolderId") parentFolderId: number,
    @Body() data: UpdateParentFolderRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedParentFolder =
      await this.parentFolderService.UpdateParentFolder(
        parentFolderId,
        data,
        user
      );
    return updatedParentFolder;
  }

  @Authorized()
  @Delete("/parent_folder/:parentFolderId([0-9]+)")
  async DeleteParentFolder(
    @Param("parentFolderId") parentFolderId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.parentFolderService.DeleteParentFolder(parentFolderId, user);
    return null;
  }

  @Authorized()
  @Get("/parent_folder")
  async GetParentFoldersAndPlans(
    @CurrentUser()
    user: IRedisUserModel,
    @Query() data: GetParentFolderAndPlanRequest,
    @Res() res: Response
  ) {
    const users = await this.parentFolderService.GetParentFoldersAndPlans(
      data,
      user
    );
    return users;
  }

  @Authorized()
  @Get("/parent_folder/dashboard")
  async GetParentFoldersAndPlansDashboard(
    @CurrentUser()
    user: IRedisUserModel,
    @Query() data: GetParentFolderAndPlanRequest,
    @Res() res: Response
  ) {
    const users =
      await this.parentFolderService.GetParentFoldersAndPlansDashboard(
        data,
        user
      );
    return users;
  }

  @Authorized()
  @Get("/parent_folder/search")
  async SearchParentFolders(
    @Query() data: ParentFolderSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.parentFolderService.SearchParentFolder(data, user);
    return users;
  }

  @Authorized()
  @Get("/parent_folder/:parentFolderId([0-9]+)")
  async GetParentFolderPlans(
    @Param("parentFolderId") parentFolderId: number,
    @Query() data: GetParentFolderAndPlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    data.parent_folder_id = [parentFolderId];
    const plansData = await this.parentFolderService.GetParentFoldersAndPlans(
      data,
      user
    );
    return plansData;
  }

  @Authorized()
  @Post("/parent_folder/pin")
  async PinFolder(
    @Body() data: PinFolderRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const folderPinned = await this.parentFolderService.PinParentFolders(
      data,
      user,
    );
    return folderPinned;
  }

  @Authorized()
  @Put("/parent_folder/unpin")
  async UnpinFolder(
    @Body() data: PinFolderRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.parentFolderService.UnpinParentFolders(
      data,
      user,
    );
    return true;
  }

  @Authorized()
  @Get("/parent_folder/homepage")
  async GetParentFoldersHomepage(
    @CurrentUser()
    user: IRedisUserModel,
    @Query() data: GetParentFolderAndPlanRequest,
    @Res() res: Response
  ) {
    const parentFolders =
      await this.parentFolderService.GetParentFoldersHomepage(
        data,
        user,
      );

    return parentFolders;
  }
}
