
import { IRedisUserModel, UserRoles } from "../../../app/model/user/UserModel";
import { Request, Response } from "express";
import {
  CreatePlanRequest,
  UpdatePlanRequest,
  DeletePlanRequest,
  UpdatePlanColorRequest,
  ArchivePlanRequest,
  GetPlanRequest,
  ArchiveMultiplePlanRequest,
  GetPlanCommunicationsRequest,
  PlanSearchRequest,
  PlanByStatusRequest,
  GetUsersByPlanIdRequest,
  DuplicatePlanRequest,
  OverrideActualBudgetRequest,
  GetPlanSocialPostsRequest,
  AddPlanToFolderRequest,
  AddFileRequest,
  FileTypeRequest,
  PlanAndCommunicationSearchRequest,
  StarPlanRequest,
  UpdatePlanOnPageRequest,
} from "./PlanRequest";
import { PlanService } from "../../../app/service/plan/PlanService";
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
  UploadedFiles,
  Req,
  UseBefore,
} from "routing-controllers";
import { Authorized } from "../../../app/decorator/Authorized";
import { GetMulterObj } from "../../../app/service/aws/MediaService";
import { isArray } from "util";
import { CheckSubDomain } from "../../../app/helpers/UtilHelper";
import { GetParentFolderAndPlanRequest } from "../parent_folder/ParentFolderRequest";
import { InjectSubdomainMiddleware } from "../../../app/middleware/InjectSubdomainMiddleware";
import { UserBusinessAreasSearchRequest } from "../user/UserRequest";

@ApiTags()
@Controller()
export class PlanController {
  constructor(private planService: PlanService) {}

  @Authorized(UserRoles.Owner, UserRoles.Admin, UserRoles.User)
  @UseBefore(InjectSubdomainMiddleware)
  @Post("/plan")
  async CreatePlan(
    @Body() data: CreatePlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    if (!Array.isArray(data.owner)) {
      data.owner = [data.owner];
    }
    const createdPlan = await this.planService.CreatePlan(
      data,
      user,
      subdomain
    );
    return createdPlan;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Put("/plan/:planId([0-9]+)")
  async UpdatePlan(
    @Param("planId") planId: number,
    @Body() data: UpdatePlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const subdomain = CheckSubDomain(req);
    if (!Array.isArray(data.owner)) {
      data.owner = [data.owner];
    }
    const updatedPlan = await this.planService.UpdatePlan(
      planId,
      data,
      user,
      subdomain
    );
    return updatedPlan;
  }

  @Authorized()
  @Put("/plan/budget/:planId([0-9]+)")
  async OverrideActualBudget(
    @Param("planId") planId: number,
    @Body() data: OverrideActualBudgetRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedPlan = await this.planService.OverrideActualBudget(
      planId,
      data,
      user
    );
    return updatedPlan;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Put("/plan/status/:planId([0-9]+)")
  async ArchivePlan(
    @Param("planId") planId: number,
    @Body() data: ArchivePlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedPlan = await this.planService.ArchivePlan(planId, data, user);
    return updatedPlan;
  }

  @Authorized()
  @Put("/plan/archive/multiple")
  async ArchiveMultiplePlans(
    @Body() data: ArchiveMultiplePlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedPlan = await this.planService.ArchiveMultiplePlans(data, user);
    return updatedPlan;
  }

  @Authorized()
  @Put("/plan/color/:planId([0-9]+)")
  async UpdatePlanColor(
    @Param("planId") planId: number,
    @Body() data: UpdatePlanColorRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const updatedPlan = await this.planService.UpdatePlanColor(
      planId,
      data,
      user
    );
    return updatedPlan;
  }

  @Authorized()
  @Delete("/plan/:planId([0-9]+)")
  async DeletePlan(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.planService.DeletePlan(planId, user);
    return null;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/plan")
  async GetPlans(
    @Query() data: GetPlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const plans = await this.planService.GetPlans(data, user);
    return plans;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/plan/:planId([0-9]+)/communications")
  async GetCommunicationsByPlanId(
    @Param("planId") planId: number,
    @Query() data: GetPlanCommunicationsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const plans = await this.planService.GetCommunicationsByPlanId(
      planId,
      data,
      user
    );
    return plans;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/plan/search")
  async SearchPlan(
    @Query() data: PlanSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    if (data.status) {
      data.status = isArray(data.status) ? data.status : [data.status];
    }
    const plans = await this.planService.SearchPlans(data, user);
    return plans;
  }

  @Authorized()
  @UseBefore(InjectSubdomainMiddleware)
  @Get("/full-text-search")
  async PlanAndCommunicationSearch(
    @Query() data: PlanAndCommunicationSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    if (data.status) {
      data.status = Array.isArray(data.status) ? data.status : [data.status];
    }
    const result = await this.planService.PlanAndCommunicationSearch(data, user);
    return result;
  }

  @Authorized()
  @Get("/plan/color")
  async CompanyPlanColors(
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    let colors = await this.planService.PlanColors(user);
    req.subdomains.forEach((subdomain) => {
      if (subdomain == "angloamerican" || subdomain == "stg1") {
        colors = {
          colors: [
            "#031795",
            "#465eb6",
            "#9aa2d5",
            "#347ff6",
            "#6fa5f9",
            "#abcbfa",
            "#FE0000",
            "#FE8C00",
            "#ffb066",
            "#ffd2a7",
            "#F5D700",
            "#f7e34d",
            "#fbef99",
            "#64b246",
            "#97ca83",
            "#c2e0bb",
            "#19ebdc",
            "#7ff0e9",
            "#b9f6ef",
            "#b90c78",
            "#cd63a4",
            "#e8a5cb",
            "#6c2382",
            "#9969a7",
            "#c4a9cc",
            "#666666",
          ],
        };
      }
    });
    return colors;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)")
  async GetPlanById(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const plan = await this.planService.GetPlanById(planId, user);
    return plan;
  }

  @Authorized()
  @Post("/plan/delete")
  async DeletePlans(
    @Body() data: DeletePlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const deletedPlan = await this.planService.DeletePlans(data, user);
    return deletedPlan;
  }

  @Authorized()
  @Post("/plan/upload/:planId")
  async FileUploads(
    @Param("planId") planId: number,
    @UploadedFiles("file[]", { required: true, options: GetMulterObj() })
    files: any,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const media = await this.planService.UploadFiles(planId, files, user);
    return media;
  }

  @Authorized()
  @Post("/plan/file/:planId")
  async AddFile(
    @Param("planId") planId: number,
    @Body() data: AddFileRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const media = await this.planService.AddFiles(planId, data, user);
    return media;
  }

  @Authorized()
  @Put("/plan/file/:planFileId")
  async UpdatePlanFile(
    @Param("planFileId") planFileId: number,
    @Body() data: FileTypeRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const media = await this.planService.UpdatePlanFile(planFileId, data, user);
    return media;
  }

  @Authorized()
  @Delete("/plan/file/:planFileId")
  async DeletePlanFile(
    @Param("planFileId") planFileId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    await this.planService.DeletePlanFile(planFileId, user);
    return null;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)/users")
  async GetUsersByPlanId(
    @Param("planId") planId: number,
    @Query() data: GetUsersByPlanIdRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    if (data.business_area) {
      data.business_area = Array.isArray(data.business_area)
        ? data.business_area
        : [data.business_area];
    }
    if (data.business_area_permission) {
      data.business_area_permission = Array.isArray(
        data.business_area_permission
      )
        ? data.business_area_permission
        : [data.business_area_permission];
    }
    const users = await this.planService.GetUsersByPlanId(planId, data, user);
    return users;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)/business_area")
  async GetBusinessAreasByPlanId(
    @Param("planId") planId: number,
    @Query() data: UserBusinessAreasSearchRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const businessAreas = await this.planService.GetBusinessAreasByPlanId(
      planId,
      data,
      user
    );
    return businessAreas;
  }

  @Authorized()
  @Put("/plan/duplicate/:planId([0-9]+)")
  async DuplicatePlan(
    @Param("planId") planId: number,
    @Body() data: DuplicatePlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const plan = await this.planService.DuplicatePlanById(planId, data, user);
    return plan;
  }

  @Authorized()
  @Get("/plan/:planId/social_posts")
  async GetCommunicationSocialPosts(
    @Param("planId") planId: number,
    @Query() params: GetPlanSocialPostsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const socialPosts = await this.planService.GetPlanSocialPosts(
      planId,
      params,
      user
    );
    return socialPosts;
  }

  @Authorized()
  @Put("/plan/:planId/plan_folder")
  async AddPlanToFolder(
    @Param("planId") planId: number,
    @Body() params: AddPlanToFolderRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const socialPosts = await this.planService.AddPlanToFolder(
      planId,
      params,
      user
    );
    return socialPosts;
  }

  @Authorized()
  @Get("/plan/:planId/user_in_communication/:userId")
  async CheckIfUserInCommunication(
    @Param("planId") planId: number,
    @Param("userId") userId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const socialPosts = await this.planService.CheckIfUserInCommunication(
      planId,
      userId,
      user
    );
    return socialPosts;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)/files")
  async GetPlanAndCommunicationFiles(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const files = await this.planService.GetPlanAndCommunicationFiles(
      planId,
      user
    );

    return files;
  }

  @Authorized()
  @Get("/plan/homepage")
  async GetHomePagePlans(
    @Query() data: GetParentFolderAndPlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const plans = await this.planService.GetHomePagePlans(data, user);
    return plans;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)/phases")
  async GetPhasesByPlanId(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const phases = await this.planService.GetPhasesByPlanId(planId);
    return phases;
  }

  @Authorized(UserRoles.Admin, UserRoles.Owner)
  @Put("/plan/:planId([0-9]+)/star")
  async StarPlan(
    @Param("planId") planId: number,
    @Body() data: StarPlanRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const plan = await this.planService.StarPlan(data, planId, user);
    return plan;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)/plan-on-page")
  async GetPlanOnPage(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const planOnPage = await this.planService.GetPlanOnPage(planId, user);
    return planOnPage;
  }

  @Authorized()
  @Put("/plan/:planId([0-9]+)/plan-on-page")
  async UpdatePlanOnPage(
    @Param("planId") planId: number,
    @Body() data: UpdatePlanOnPageRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const planOnPage = await this.planService.UpdatePlanOnPage(data, planId, user);
    return planOnPage;
  }

  @Authorized()
  @Get("/plan/:planId([0-9]+)/plan-on-page/export")
  async ExportPlanOnPage(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const planOnPage = await this.planService.ExportPlanOnPage(planId, user, req);
    return planOnPage;
  }

  @Authorized()
  @Put("/plan/:planId([0-9]+)/ragb-refresh")
  async ForceRefreshRAGB(
    @Param("planId") planId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const newRAGBStatus = await this.planService.ForceRefreshRAGB(planId, user);
    return newRAGBStatus;
  }
}
