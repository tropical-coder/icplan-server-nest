import { PaginationParam } from "../../../app/controller/base/BaseRequest";

import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import {
  CreateCommunicationRequest,
  UpdateCommunicationRequest,
  CommunicationSearchRequest,
  DeleteCommunicationRequest,
  DuplicateCommunicationRequest,
  UpdateCommunicationBudgetRequest,
  GetCommunicationSocialPostsRequest,
  UpdateTaskPositionRequest,
  UpdateCommunicationInSwimlaneRequest,
  UpdateCommunicationStatusRequest,
  GenerateWeeklyReportRequest,
  UpdateCommunicationInlineRequest,
} from "./CommunicationRequest";
import { CommunicationService } from "../../../app/service/communication/CommunicationService";
import {
  Body,
  Post,
  Patch,
  Get,
  Res,
  JsonController,
  QueryParams,
  QueryParam,
  CurrentUser,
  Put,
  Param,
  Delete,
  UploadedFiles,
  Req,
  UseBefore,
  BadRequestException,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { GetMulterObj } from "../../../app/service/aws/MediaService";
import { AddFileRequest, FileTypeRequest } from "../plan/PlanRequest";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";
import { InjectSubdomainMiddleware } from "../../../app/middleware/InjectSubdomainMiddleware";

@ApiTags()
@Controller()
export class CommunicationController {
  constructor(private communicationService: CommunicationService) {}

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Post("/communication")
  async CreateCommunication(
    @Body() data: CreateCommunicationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const createdCommunication =
      await this.communicationService.CreateCommunication(
        data,
        user,
        data._subdomain
      );
    return createdCommunication;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Put("/communication/:communicationId")
  async UpdateCommunication(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateCommunicationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedCommunication =
      await this.communicationService.UpdateCommunication(
        communicationId,
        data,
        user,
        data._subdomain
      );
    return updatedCommunication;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Put("/communication/:communicationId/inline")
  async UpdateCommunicationInline(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateCommunicationInlineRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedCommunication =
      await this.communicationService.UpdateCommunicationInline(
        communicationId,
        data,
        user,
        data._subdomain
      );
    return updatedCommunication;
  }

  @Authorized()
  @Patch("/communication/:communicationId")
  async UpdateCommunicationInSwimlane(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateCommunicationInSwimlaneRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    const updatedCommunication =
      await this.communicationService.UpdateCommunicationInSwimlane(
        communicationId,
        data,
        user,
        subdomain
      );
    return updatedCommunication;
  }

  @Authorized()
  @Put("/communication/budget/:communicationId")
  async UpdateCommunicationBudget(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateCommunicationBudgetRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedCommunication =
      await this.communicationService.UpdateCommunicationBudget(
        communicationId,
        data,
        user
      );
    return updatedCommunication;
  }

  @Authorized()
  @Delete("/communication/:communicationId")
  async DeleteCommunication(
    @Param("communicationId") communicationId: number,
    @QueryParam("deletion_type") deletion_type: string,
    @CurrentUser() user: IRedisUserModel,
    @Res() res: Response
  ) {
    // deletionType: 'this' | 'following' | 'all'
    // Determine valid deletion type, default to 'this'
    const validTypes = ['this', 'following', 'all'];
    
    if (deletion_type && !validTypes.includes(deletion_type)) {
      throw new BadRequestException(`Invalid deletion_type. Valid types are: '${validTypes.join("', '")}'`);
    }
    await this.communicationService.DeleteCommunication(
      communicationId,
      user,
      deletion_type as any
    );
    return null;
  }

  @Authorized()
  @Get("/communication")
  async GetCommunications(
    @Query() data: PaginationParam,
    @Res() res: Response
  ) {
    const users = await this.communicationService.GetCommunications(data);
    return users;
  }

  @Authorized()
  @Get("/communication/search")
  async SearchCommunication(
    @Query() communicationSearchRequest: CommunicationSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const communications = await this.communicationService.SearchCommunications(
      communicationSearchRequest,
      user
    );
    return communications;
  }

  @Authorized()
  @Get("/communication/single/:communicationId")
  async CommunicationById(
    @Param("communicationId") communicationId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const communications = await this.communicationService.GetCommunicationById(
      communicationId,
      user
    );
    return communications;
  }

  @Authorized()
  @Post("/communication/delete")
  async DeleteCommunications(
    @Body() data: DeleteCommunicationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const deletedCommunication =
      await this.communicationService.DeleteCommunications(data, user);
    return deletedCommunication;
  }

  @Authorized()
  @Post("/communication/upload/:communicationId")
  async FileUploads(
    @Param("communicationId") communicationId: number,
    @UploadedFiles("file[]", { required: true, options: GetMulterObj() })
    files: any,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const media = await this.communicationService.UploadFiles(
      communicationId,
      files,
      user
    );
    return media;
  }

  @Authorized()
  @Post("/communication/file/:communicationId")
  async AddFile(
    @Param("communicationId") communicationId: number,
    @Body() data: AddFileRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const media = await this.communicationService.AddFiles(
      communicationId,
      data,
      user
    );
    return media;
  }

  @Authorized()
  @Put("/communication/file/:communicationFileId")
  async UpdateCommunicationFile(
    @Param("communicationFileId") communicationFileId: number,
    @Body() data: FileTypeRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const media = await this.communicationService.UpdateCommunicationFile(
      communicationFileId,
      data,
      user
    );
    return media;
  }

  @Authorized()
  @Delete("/communication/file/:communicationFileId")
  async DeleteCommunicationFile(
    @Param("communicationFileId") communicationFileId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.communicationService.DeleteCommunicationFile(
      communicationFileId,
      user
    );
    return null;
  }

  @Authorized()
  @Put("/communication/duplicate/:communicationId")
  async DuplicateCommunication(
    @Param("communicationId") communicationId: number,
    @Body() data: DuplicateCommunicationRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const communications =
      await this.communicationService.DuplicateCommunicationById(
        communicationId,
        data,
        user
      );
    return communications;
  }

  @Authorized()
  @Get("/communication/:communicationId/users")
  async GetCommunicationTeamById(
    @Param("communicationId") communicationId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const users = await this.communicationService.GetCommunicationTeamById(
      communicationId,
      user
    );
    return users;
  }

  @Authorized()
  @Get("/communication/:communicationId/social_posts")
  async GetCommunicationSocialPosts(
    @Param("communicationId") communicationId: number,
    @Query() params: GetCommunicationSocialPostsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const socialPosts =
      await this.communicationService.GetCommunicationSocialPosts(
        communicationId,
        params,
        user
      );
    return socialPosts;
  }

  @Authorized()
  @Put("/communication/task-position/:communicationId")
  async UpdateTaskPosition(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateTaskPositionRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const communications = await this.communicationService.UpdateTaskPosition(
      communicationId,
      data,
      user
    );
    return communications;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Put("/communication/status/:communicationId([0-9]+)")
  async ArchivePlan(
    @Param("communicationId") communicationId: number,
    @Body() data: UpdateCommunicationStatusRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedPlan = await this.communicationService.UpdateCommunicationStatus(communicationId, data, user);
    return updatedPlan;
  }

  @Authorized()
  @Get("/communication/weekly-report")
  async GenerateWeeklyReport(
    @Query() params: GenerateWeeklyReportRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const weeklyReport = await this.communicationService.GenerateWeeklyReport(params, user, req);
    return weeklyReport;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/communication/weekly-report/preview")
  async PreviewWeeklyReport(
    @Query() params: GenerateWeeklyReportRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const weeklyReport = await this.communicationService.PreviewWeeklyReport(params, user);
    return weeklyReport;
  }
}
