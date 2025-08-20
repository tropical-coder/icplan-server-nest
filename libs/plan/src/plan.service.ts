import { PlanAndCommunicationSearchRequest, StarPlanRequest, UpdatePlanOnPageRequest } from "../../../api/controller/plan/PlanRequest";
import { BadRequestException } from "routing-controllers";
import { PlanRepository } from "../../repository/plan/PlanRepository";
import { ParentFolderRepository } from "../../repository/parent_folder/ParentFolderRepository";
import { CommunicationRepository } from "../../repository/communication/CommunicationRepository";
import { CommunicationPermissionRepository } from "../../repository/communication/CommunicationPermissionRepository";
import { TaskRepository } from "../../repository/task/TaskRepository";
import { UserRepository } from "../../repository/user/UserRepository";
import { PlanFilesRepository } from "../../repository/plan/PlanFilesRepository";
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { SocialIntegrationRepository } from "../../repository/social_integration/SocialIntegrationRepository";
import { ColorRepository } from "../../repository/color/ColorRepository";

import { PlanModel, PlanStatus, RAGBStatus } from "../../model/plan/PlanModel";
import { CompanyService } from "../company/CompanyService";
import {
  CreatePlanRequest,
  UpdatePlanRequest,
  DeletePlanRequest,
  UpdatePlanColorRequest,
  ArchivePlanRequest,
  ArchiveMultiplePlanRequest,
  PlanSearchRequest,
  GetPlanRequest,
  GetPlanCommunicationsRequest,
  GetUsersByPlanIdRequest,
  DuplicatePlanRequest,
  OverrideActualBudgetRequest,
  AddPlanToFolderRequest,
  AddFileRequest,
  FileTypeRequest,
} from "../../../api/controller/plan/PlanRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { ChangeDateFormat, CheckPlanChanged, CheckSubDomain, DeepClone, ExportPdf, GetPaginationOptions, GetTimePercentagePassed, SnakeCaseToNormal } from "../../helpers/UtilHelper";
import { In, IsNull } from "typeorm";
import {
  UserModel,
  IRedisUserModel,
  UserRoles,
} from "../../model/user/UserModel";
import {
  CommunicationModel,
  CommunicationStatus,
} from "../../model/communication/CommunicationModel";
import { UserService } from "../user/UserService";
import { TagService } from "../tag/TagService";
import { AudienceService } from "../audience/AudienceService";
import { ChannelService } from "../channel/ChannelService";
import { LocationService } from "../location/LocationService";
import { BusinessAreaService } from "../business_area/BusinessAreaService";
import { SocialPostRepository } from "../../repository/social-post/SocialPostRepository";
import { StrategicPriorityService } from "../strategic_priority/StrategicPriorityService";
import { FileService } from "../file/FileService";
import { PlanFilesModel } from "../../model/plan/PlanFilesModel";
import { GetGanttChartRequest } from "../../../api/controller/gantt_chart/GanttChartRequest";
import moment = require("moment");
import { TaskModel, TaskStatus } from "../../model/task/TaskModel";
import { ColorModel } from "../../model/color/ColorModel";
import * as Excel from "exceljs";
import * as stream from "stream";
import {
  UploadFileToS3,
  GetAWSSignedUrl,
  GetFileKey,
} from "../aws/MediaService";
import { UserPermission } from "../../model/user/business_area_permission/UserBusinessAreaPermissionModel";
import {
  CheckUserPermissionForPlanEdit,
  CheckUserPermissionForPlan,
  CheckUserPermissionForMultiplePlans,
  AddBusinessAreaRestriction,
  CheckUserPermissionForCommunicationEdit,
} from "../../helpers/PermissionHelper";
import { SocialIntegrationType } from "../../model/social-intergration/SocialIntegrationModel";
import { PostStatus } from "../../model/social-post/SocialPostModel";
import { YammerService } from "../social/yammer/YammerService";
import { htmlToText } from "html-to-text";
import { DomainConstants } from "../../constant/DomainConstants";
import { NotificationService } from "../notification/NotificationService";
import { NotificationConstants } from "../../constant/NotificationConstants";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { ContentTypeService } from "../content_type/ContentTypeService";
import { GetParentFolderAndPlanRequest, ParentFolderPage } from "../../../api/controller/parent_folder/ParentFolderRequest";
import { CommunicationFilesModel } from "../../model/communication/CommunicationFilesModel";
import { CommunicationFilesRepository } from "../../repository/communication/CommunicationFilesRepository";
import { GetTasksForKanbanRequest } from "../../../api/controller/task/TaskRequest";
import { PhaseRepository } from "../../repository/phase/PhaseRepository";
import { NotificationRuleEntity } from "../../model/notification/NotificationRuleModel";
import { NotificationRuleRepository } from "../../repository/notification/NotificationRuleRepository";
import { UserBusinessAreasSearchRequest } from "../../../api/controller/user/UserRequest";
import { BusinessAreaModel } from "../../model/business_area/BusinessAreaModel";
import { PlanOnPageRepository } from "../../repository/plan/PlanOnPageRepository";
import { PlanOnPageModel } from "../../model/plan/PlanOnPageModel";
import { Request } from "express";
import { ActiveCampaignService } from "../active_campaign/ActiveCampaignService";
import { appEnv } from "../../helpers/EnvHelper";
import { BudgetRepository } from "../../repository/budget/BudgetRepository";
import { BudgetModel } from "../../model/budget/BudgetModel";
import { CreatePlanBudgetRequest, UpdatePlanBudgetRequest } from "../../../api/controller/budget/BudgetRequest";
import { RiskRepository } from "../../repository/risk/RiskRepository";
import { RiskModel, RiskStatus } from "../../model/risk/RiskModel";
import { PhaseStatus } from "../../model/phase/PhaseModel";
import { CommentRepository } from "../../repository/comment/CommentRepository";
import { AnalyticsRequest } from "../../../api/controller/analytics/AnalyticsRequest";
import { CompanyUserLicenseRepository } from "../../repository/company/CompanyUserLicenseRepository";
import { statusConfig } from "../../constant/StatusConstant";

@Injectable()
export class PlanService {
  constructor(
    private planRepository: PlanRepository,
    private planFilesRepository: PlanFilesRepository,
    private planPermissionRepository: PlanPermissionRepository,
    private parentFolderRepository: ParentFolderRepository,
    private communicationRepository: CommunicationRepository,
    private communicationPermissionRepository: CommunicationPermissionRepository,
    private userRepository: UserRepository,
    private colorRepository: ColorRepository,
    private socialPostRepository: SocialPostRepository,
    private userService: UserService,
    private locationService: LocationService,
    private businessAreaService: BusinessAreaService,
    private tagService: TagService,
    private yammerService: YammerService,
    private channelService: ChannelService,
    private audienceService: AudienceService,
    private strategicPriorityService: StrategicPriorityService,
    private socialIntegrationRepository: SocialIntegrationRepository,
    private fileService: FileService,
    private taskRepository: TaskRepository,
    private notificationService: NotificationService,
    private companyRepository: CompanyRepository,
    private contentTypeService: ContentTypeService,
    private companyService: CompanyService,
    private communicationFilesRepository: CommunicationFilesRepository,
    private phaseRepository: PhaseRepository,
    private notificationRuleRepository: NotificationRuleRepository,
    private planOnPageRepository: PlanOnPageRepository,
    private activeCampaignService: ActiveCampaignService,
    private budgetRepository: BudgetRepository,
    private riskRepository: RiskRepository,
    private commentRepository: CommentRepository,
    private companyUserLicenseRepository: CompanyUserLicenseRepository,
  ) {}

  private async ManageColor(color, companyId: number) {
    if (!color) {
      return false;
    }
    let colorExist = await this.colorRepository.FindOne({
      color: color,
      company_id: companyId,
    });
    if (!colorExist) {
      let colorModel = new ColorModel();
      colorModel.company_id = companyId;
      colorModel.color = color;
      await this.colorRepository.Save(colorModel);
    }
  }

  private async UpdateFile(file) {
    if (file.is_aws) {
      let key = GetFileKey(file.path);
      file.path = await GetAWSSignedUrl(key);
    }
  }

  private async UpdateEntityFilesSignedUrl(entity: Array<any>) {
    for (
      let entityIndex = 0, entityLength = entity.length;
      entityIndex < entityLength;
      entityIndex++
    ) {
      if (entity[entityIndex].files) {
        for (
          let entityFilesIndex = 0,
            planFilesLength = entity[entityIndex].files.length;
          entityFilesIndex < planFilesLength;
          entityFilesIndex++
        ) {
          await this.UpdateFile(entity[entityIndex].files[entityFilesIndex].file);
        }
      }
    }
  }

  private async GetOwnerAndTeam(
    data,
    businessAreas,
    user: IRedisUserModel
  ): Promise<{ owner: UserModel[]; team: UserModel[] }> {
    let businessAreaIds: number[] = businessAreas.map((ba) => ba.Id);

    let ownerPromise = this.userRepository.GetUserWithBARights(
      {
        user_ids: data.owner,
        business_areas: businessAreaIds,
        business_area_permission: UserPermission.Edit,
      },
      user
    );

    let teamPromise = this.userRepository.GetUserWithBARights(
      {
        user_ids: data.team ? data.team : [],
        business_areas: businessAreaIds,
        is_deleted: false,
      },
      user
    );

    let [owner, team] = await Promise.all([ownerPromise, teamPromise]);

    return { owner, team };
  }

  private async GetPlanDependentEntities(data, user: IRedisUserModel) {
    let busienssAreasPromise = this.businessAreaService.fetchBusinessAreas(
      data.business_areas,
      user.company_id
    );
    let tagsPromise = this.tagService.fetchTags(data.tags, user.company_id);
    let strategicPrioritiesPromise =
      this.strategicPriorityService.fetchStrategicPriorities(
        data.strategic_priorities,
        user.company_id
      );

    let [businessAreas, tags, strategicPriorities] = await Promise.all([
      busienssAreasPromise,
      tagsPromise,
      strategicPrioritiesPromise,
    ]);

    return { businessAreas, tags, strategicPriorities };
  }

  private async DeletePlanPermissionByPlanId(planId: number) {
    await this.planPermissionRepository.Delete({ plan_id: planId }, false);
  }

  private async GeneratePlanPermissionByPlan(
    planId: number,
    user: IRedisUserModel
  ) {
    await this.planPermissionRepository.AddOwnerToPlanPermission(planId, user);
    await this.planPermissionRepository.AddPlanUsersPermission(
      planId,
      "edit",
      user
    );
    await this.planPermissionRepository.AddPlanUsersPermission(
      planId,
      "read",
      user
    );
  }

  private async GenerateCommunicationPermission(
    communicationId: number,
    user: IRedisUserModel
  ) {
    await this.communicationPermissionRepository.AddOwnerToCommunicationPermission(
      [communicationId],
      user
    );
    await this.communicationPermissionRepository.AddCommunicationUsersPermission(
      [communicationId],
      "edit",
      user
    );
    await this.communicationPermissionRepository.AddCommunicationUsersPermission(
      [communicationId],
      "read",
      user
    );
  }

  private async SendPlanCreationNotification(plan: PlanModel) {
    const company = await this.companyRepository.FindOne({
      Id: plan.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const ownerAddedConstant = DeepClone(
      NotificationConstants.PlanOwnerAssigned
    );
    ownerAddedConstant.body = ownerAddedConstant.body.replace(
      "{{title}}",
      plan.title
    );
    ownerAddedConstant.info = { plan_id: plan.Id };

    await this.notificationService.SendNotification(
      ownerAddedConstant,
      plan.owner,
      "assignment_notification"
    );

    const teamAddedConstant = DeepClone(NotificationConstants.PlanTeamAssigned);
    teamAddedConstant.body = teamAddedConstant.body.replace(
      "{{title}}",
      plan.title
    );
    teamAddedConstant.info = { plan_id: plan.Id };

    await this.notificationService.SendNotification(
      teamAddedConstant,
      plan.team,
      "assignment_notification"
    );

    return true;
  }

  private async SendStatusChangedNotification(
    plan: PlanModel,
    users: UserModel[],
    subdomain: string
  ) {
    const company = await this.companyRepository.FindOne({
      Id: plan.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const planStatuses = statusConfig.plan[subdomain] || statusConfig.plan.default;
    const constant = DeepClone(NotificationConstants.PlanStatusChanged);
    constant.body = constant.body
      .replace("{{title}}", plan.title)
      .replace(
        "{{status}}",
        planStatuses[plan.status] || plan.status
      );
    constant.info = { plan_id: plan.Id };

    await this.notificationService.SendNotification(
      constant,
      users,
      "status_change_notification"
    );

    return true;
  }

  private async SendPlanAssigneeChangeNotification(
    plan: PlanModel,
    newOwnerAssignees: UserModel[],
    oldOwnerAssignees: UserModel[],
    newTeamAssignees: UserModel[],
    oldTeamAssignees: UserModel[]
  ) {
    const company = await this.companyRepository.FindOne({
      Id: plan.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    if (oldOwnerAssignees.length) {
      const constant = DeepClone(NotificationConstants.PlanOwnerRemoved);
      constant.body = constant.body.replace("{{title}}", plan.title);
      constant.info = { plan_id: plan.Id };

      await this.notificationService.SendNotification(
        constant,
        oldOwnerAssignees,
        "assignment_notification"
      );
    }

    if (oldTeamAssignees.length) {
      const constant = DeepClone(NotificationConstants.PlanTeamRemoved);
      constant.body = constant.body.replace("{{title}}", plan.title);
      constant.info = { plan_id: plan.Id };

      await this.notificationService.SendNotification(
        constant,
        oldTeamAssignees,
        "assignment_notification"
      );
    }

    if (newOwnerAssignees.length) {
      const constant = DeepClone(NotificationConstants.PlanOwnerAssigned);
      constant.body = constant.body.replace("{{title}}", plan.title);
      constant.info = { plan_id: plan.Id };

      await this.notificationService.SendNotification(
        constant,
        newOwnerAssignees,
        "assignment_notification"
      );
    }

    if (newTeamAssignees.length) {
      const constant = DeepClone(NotificationConstants.PlanTeamAssigned);
      constant.body = constant.body.replace("{{title}}", plan.title);
      constant.info = { plan_id: plan.Id };

      await this.notificationService.SendNotification(
        constant,
        newTeamAssignees,
        "assignment_notification"
      );
    }

    return true;
  }

  private async SendPlanDuplicateNotification(
    plan: PlanModel,
    oldPlanTitle: string,
    users: UserModel[]
  ) {
    const company = await this.companyRepository.FindOne({
      Id: plan.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const constant = DeepClone(NotificationConstants.PlanDuplicated);
    constant.body = constant.body
      .replace("{{newTitle}}", plan.title)
      .replace("{{title}}", oldPlanTitle)

    constant.info = { plan_id: plan.Id };

    await this.notificationService.SendNotification(
      constant,
      users,
      "assignment_notification"
    );

    return true;
  }

  private async createCommunicationFiles(
    files, 
    user: IRedisUserModel, 
    communicationModel: CommunicationModel
  ): Promise<CommunicationFilesModel[]> {
    let fileModels = await this.fileService.CreateMultiple(files, user);

    let communicationFilesModels: CommunicationFilesModel[] = [];
    for (let index = 0, len = fileModels.length; index < len; index++) {
        let communicationFilesModel = new CommunicationFilesModel();
        communicationFilesModel.communication_id = communicationModel.Id;
        communicationFilesModel.file = fileModels[index];
        communicationFilesModels.push(communicationFilesModel);
    }
    await this.communicationFilesRepository.CreateAll(communicationFilesModels);

    await Promise.all(communicationFilesModels.map(
      (communicationFilesModel) => this.UpdateFile(communicationFilesModel.file)
    ));

    return communicationFilesModels;
  }

  public async fetchPlan(planIds: Array<number>, companyId: number, select?: Array<string>) {
    let planPromise: Promise<PlanModel[]> = new Promise((resolve) => {
      resolve([]);
    });

    if (planIds?.length > 0) {
      planPromise = this.planRepository.Find(
        {
          Id: In(planIds),
          company_id: companyId,
          is_deleted: 0,
        },
        null,
        select
      );
    }

    return planPromise;
  }

  private async SendRuleBasedNotification(
    updatePlan: PlanModel,
    user: IRedisUserModel,
    oldPlan?: PlanModel,
  ) {
    const entityRemovedPlan: PlanModel = DeepClone(updatePlan), entityAddedPlan: PlanModel = DeepClone(updatePlan);
    if (oldPlan) {
      entityRemovedPlan.tags = oldPlan.tags.filter(
        (tag) => !updatePlan.tags.some((updatedTag) => updatedTag.Id === tag.Id)
      );
      entityAddedPlan.tags = updatePlan.tags.filter(
        (tag) => !oldPlan.tags.some((oldTag) => oldTag.Id === tag.Id)
      );

      if (CheckPlanChanged(oldPlan, updatePlan)) {
        const users = await this.planRepository.GetNotificationRuleUsersForPlan(updatePlan.Id, user);

        users.forEach(async (user) => {
          const constant = DeepClone(NotificationConstants.PlanUpdated);
          constant.body = constant.body.replace("{{title}}", updatePlan.title);
          constant.info = {
            plan_id: updatePlan.Id,
          };

          await this.notificationService.SendNotification(
            constant,
            [user],
          );
        });
      }
    }

    let users = await this.planRepository.GetNotificationRuleUsers(entityAddedPlan, user);

    users.forEach(async (user) => {
      const constant = DeepClone(NotificationConstants.EntityAddedToPlan);
      constant.body = constant.body
        .replace("{{entity}}", SnakeCaseToNormal(user.entity)) 
        .replace("{{entityName}}", user.entity_name)
        .replace("{{planName}}", entityAddedPlan.title);

      constant.info = {
        plan_id: entityAddedPlan.Id,
      };

      await this.notificationService.SendNotification(
        constant,
        [user],
      );
    });

    if (!oldPlan){
      return true;
    }

    users = await this.planRepository.GetNotificationRuleUsers(entityRemovedPlan, user);

    users.forEach(async (user) => {
      const constant = DeepClone(NotificationConstants.EntityRemovedFromPlan);
      constant.body = constant.body
        .replace("{{entity}}", SnakeCaseToNormal(user.entity)) 
        .replace("{{entityName}}", user.entity_name)
        .replace("{{planName}}", entityRemovedPlan.title);

      constant.info = {
        plan_id: entityRemovedPlan.Id,
      };

      await this.notificationService.SendNotification(
        constant,
        [user],
      );
    });

    return true;
  }

  private async UpdateEntityCountsOnActiveCampaign(companyId: number) {
    if (!appEnv("AC_ENABLED")) {
      return;
    }
    const [companyOwner, company] = await Promise.all([
      this.userRepository.FindOne({ company_id: companyId, role: UserRoles.Owner }),
      this.companyService.GetCompanyWithCounts(companyId),
    ]);

    await this.activeCampaignService.UpdateCustomFieldValue(
      companyOwner.email,
      [
        {
          field: appEnv("AC_FIELD_PLAN_COUNT"),
          value: company.plan_count,
        },
        {
          field: appEnv("AC_FIELD_COMM_COUNT"),
          value: company.communication_count,
        },
        {
          field: appEnv("AC_FIELD_TASK_COUNT"),
          value: company.task_count
        }
      ]
    );
  }

  public async CreatePlan(
    data: CreatePlanRequest,
    user: IRedisUserModel,
    subdomain: string
  ): Promise<PlanModel> {
    // TODO: Check whether creator has permission to given business areas
    let { businessAreas, tags, strategicPriorities } =
      await this.GetPlanDependentEntities(data, user);

    if (businessAreas.length !== data.business_areas.length) {
      throw new BadRequestException("Business Area Not Found");
    }

    let { owner, team } = await this.GetOwnerAndTeam(data, businessAreas, user);

    if (!owner || owner.length !== data.owner.length) {
      const message =
        "User(s) selected as Plan owner should have edit rights to selected Business Areas.".replace(
          "Business Area",
          DomainConstants[subdomain].BusinessArea
        );
      throw new BadRequestException(message);
    }

    let [parentFolder, company, companyOwner] = await Promise.all([
      this.parentFolderRepository.FindOne({
        Id: data.parent_folder_id || 0,
      }),
      this.companyService.GetCompanyWithCounts(user.company_id),
      this.userRepository.FindOne({ company_id: user.company_id, role: UserRoles.Owner }),
    ]);

    if (!parentFolder) {
      throw new BadRequestException("Invalid Parent folder selected.");
    }

    if (company.plan_count >= company.subscription.features.plan_limit) {
      throw new BadRequestException("Plan limit exceeded.");
    }

    let planModel = new PlanModel();
    planModel.company_id = user.company_id;
    planModel.title = data.title;
    planModel.owner = owner;
    planModel.description = data.description;
    planModel.parent_folder_id = data.parent_folder_id || 0;
    planModel.objectives = data.objectives;
    planModel.key_messages = data.key_messages;
    planModel.start_date = data.start_date;
    planModel.end_date = data.end_date ? data.end_date : null;
    planModel.ongoing = data.ongoing;
    planModel.show_on_calendar = data.hasOwnProperty("show_on_calendar")
      ? data.show_on_calendar
      : true;
    planModel.business_areas = businessAreas;
    planModel.color = data.color;
    planModel.tags = tags;
    planModel.strategic_priorities = strategicPriorities;
    planModel.team = team;
    planModel.status = data.status || PlanStatus.InProgress;
    planModel.is_confidential = data.is_confidential;
    planModel.dashboard_enabled = data.dashboard_enabled ?? false;
    planModel.hide_budget = data.hide_budget ?? false;

    const plan = await this.planRepository.Create(planModel, user.Id);
    this.ManageColor(data.color, user.company_id);

    await this.GeneratePlanPermissionByPlan(plan.Id, user);
    // await this.GeneratePlanPermission(plan);

    const [planPermission, files] = await Promise.all([
      this.planPermissionRepository.FindOne({
        user_id: user.Id,
        plan_id: plan.Id,
      }),
      this.AddFiles(
        plan.Id,
        data.files ? { files: data.files } : { files: [] },
        user
      ),
    ]);

    planModel.plan_permission = [planPermission];
    planModel.parent_folder = parentFolder;

    this.SendPlanCreationNotification(planModel);
    this.SendRuleBasedNotification(planModel, user);
    this.activeCampaignService.UpdateCustomFieldValue(
      companyOwner.email,
      [
        {
          field: appEnv("AC_FIELD_PLAN_COUNT"),
          value: company.plan_count + 1,
        }
      ]
    );
    if (company.plan_count == 0) {
      this.activeCampaignService.RemoveTagFromContact(
        companyOwner.ac_contact_id,
        appEnv("AC_TAG_NO_PLAN_ADDED")
      );
    }

    return plan;
  }

  public async UpdatePlan(
    planId: number,
    data: UpdatePlanRequest,
    user: IRedisUserModel,
    subdomain: string
  ) {
    const [
      { planModel },
      { businessAreas, tags, strategicPriorities },
      oldPlanState,
    ] = await Promise.all([
      CheckUserPermissionForPlanEdit(this, planId, user),
      this.GetPlanDependentEntities(data, user),
      this.planRepository.FindOne(
        { Id: planId, company_id: user.company_id },
        { relations: ["business_areas", "tags", "strategic_priorities", "team", "owner"] }
      ),
    ]);

    if (businessAreas.length !== data.business_areas.length) {
      throw new BadRequestException("Business Area Not Found");
    }


    let { owner, team } = await this.GetOwnerAndTeam(data, businessAreas, user);

    if (!owner || owner.length !== data.owner.length) {
      const message =
        "User(s) selected as Plan owner should have edit rights to selected Business Areas.".replace(
          "Business Area",
          DomainConstants[subdomain].BusinessArea
        );
      throw new BadRequestException(message);
    }

    if (owner.find((owner) => owner.is_deleted)) {
      throw new BadRequestException(
        "This plan contains deleted user(s) highlighted in gray, please update it with alternative user(s)."
      );
    }

    let parentFolder = await this.parentFolderRepository.FindOne({
      Id: data.parent_folder_id,
    });

    if (!parentFolder) {
      throw new BadRequestException("Invalid Parent folder selected.");
    }

    // Check if confidential is changed
    if (planModel.is_confidential != data.is_confidential) {
      let ownerMatched = owner.filter((ownerUser) => user.Id == ownerUser.Id);

      if (!ownerMatched.length && user.role != UserRoles.Owner) {
        throw new BadRequestException(
          "You can't change confidentiality of this plan."
        );
      }
      // if confidential is changed, mark all comms as confidential
      await this.communicationRepository.Update(
        { plan_id: planModel.Id },
        { is_confidential: data.is_confidential }
      );
    }

    // Check if show on calendar is changed
    if (planModel.show_on_calendar != data.show_on_calendar) {
      // if show on calendar is changed, update all communications as well
      await this.communicationRepository.Update(
        { plan_id: planModel.Id },
        { show_on_calendar: data.show_on_calendar }
      );
    }

    /* mark communication as completed when plan is marked complete */
    if (data.status == PlanStatus.Complete) {
      await this.communicationRepository.Update(
        {
          plan_id: planModel.Id,
          status: In([
            CommunicationStatus.InProgress,
            CommunicationStatus.Planned,
          ]),
        },
        { status: CommunicationStatus.Complete }
      );
    }

    planModel.title = data.title || planModel.title;
    if (data.status && data.status != planModel.status) {
      planModel.status = data.status;
      this.SendStatusChangedNotification(planModel, [...team, ...owner], subdomain);
    }

    // Send notification assigned and unassigned users
    if (data.owner.length || data.team.length) {
      const [currentOwnerUsers, currentTeamUsers] = await Promise.all([
        this.userRepository.FindOwnerByPlanId(planId, planModel.company_id),
        this.userRepository.FindTeamByPlanId(planId, planModel.company_id),
      ]);

      const newOwnerAssignees: UserModel[] = owner.filter(
        (user) => !currentOwnerUsers.map(({ Id }) => +Id).includes(user.Id)
      );

      const oldOwnerAssignees: UserModel[] = currentOwnerUsers.filter(
        (user) => !owner.map(({ Id }) => +Id).includes(user.Id)
      );

      const newTeamAssignees: UserModel[] = team.filter(
        (user) => !currentTeamUsers.map(({ Id }) => +Id).includes(user.Id)
      );

      const oldTeamAssignees: UserModel[] = currentTeamUsers.filter(
        (user) => !team.map(({ Id }) => +Id).includes(user.Id)
      );

      // Send communication assigned notification
      this.SendPlanAssigneeChangeNotification(
        planModel,
        newOwnerAssignees,
        oldOwnerAssignees,
        newTeamAssignees,
        oldTeamAssignees
      );
    }

    planModel.business_areas = [];
    planModel.tags = [];
    planModel.strategic_priorities = [];
    planModel.team = [];
    planModel.owner = [];
    planModel.description = data.description;
    planModel.parent_folder_id = data.parent_folder_id;
    planModel.objectives = data.objectives;
    planModel.key_messages = data.key_messages;
    planModel.start_date = data.start_date || planModel.start_date;
    planModel.end_date = data.end_date || planModel.end_date;
    planModel.ongoing = data.ongoing;
    planModel.show_on_calendar = data.hasOwnProperty("show_on_calendar")
      ? data.show_on_calendar
      : true;
    planModel.color = data.color || planModel.color;
    planModel.is_confidential = data.is_confidential;
    planModel.dashboard_enabled = data.dashboard_enabled ?? planModel.dashboard_enabled;
    planModel.hide_budget = data.hide_budget ?? planModel.hide_budget;

    await this.planRepository.Save(planModel);

    planModel.business_areas = businessAreas;
    planModel.tags = tags;
    planModel.strategic_priorities = strategicPriorities;
    planModel.team = team;
    planModel.owner = owner;
    await this.planRepository.Save(planModel);

    this.ManageColor(data.color, user.company_id);
    await this.DeletePlanPermissionByPlanId(planModel.Id);

    await this.GeneratePlanPermissionByPlan(planId, user);

    const [plan, folderAncestors, communicationCount, commentCount] = await Promise.all([
      this.planRepository.GetPlanById(
        planId,
        user,
        [
          "owner",
          "team",
          "tags",
          "business_areas",
          "strategic_priorities",
          "files",
          "plan_permission",
        ]
      ),
      this.parentFolderRepository.GetFolderAncestors(
        planModel.parent_folder_id,
        planModel.company_id
      ),
      this.planRepository.GetPlanCommunicationCount([planId], user),
      this.commentRepository.Count({
        plan_id: planModel.Id,
        company_id: user.company_id,
      })
    ]);
    this.SendRuleBasedNotification(planModel, user, oldPlanState);

    return { 
      plan: plan,
      folderAncestors,
      communicationCount: communicationCount[0],
      commentCount
    };
  }

  public async OverrideActualBudget(
    planId: number,
    data: OverrideActualBudgetRequest,
    user: IRedisUserModel
  ): Promise<PlanModel> {
    let { planModel } = await CheckUserPermissionForPlanEdit(
      this,
      planId,
      user
    );

    planModel.budget_actual = data.budget_actual;
    await this.planRepository.Update(
      { Id: planModel.Id },
      { budget_actual: data.budget_actual }
    );

    return planModel;
  }

  public async ArchivePlan(
    planId: number,
    data: ArchivePlanRequest,
    user: IRedisUserModel
  ) {
    let { planModel } = await CheckUserPermissionForPlanEdit(this, planId, user);

    if (data.status != planModel.status) {
      planModel.status = data.status;
      const [users] = await Promise.all([
        this.userRepository.FindTeamAndOwnerByPlanId(
          planId,
          planModel.company_id
        ),
        this.planRepository.Update(
          { Id: planId, company_id: user.company_id },
          { status: data.status }
        ),
      ]);

      /* mark communication as completed when plan is marked complete */
      if (data.status == PlanStatus.Complete) {
        await this.communicationRepository.Update(
          {
            plan_id: planModel.Id,
            status: In([
              CommunicationStatus.InProgress,
              CommunicationStatus.Planned,
            ]),
          },
          { status: CommunicationStatus.Complete }
        );
      }

      this.SendStatusChangedNotification(planModel, users, data._subdomain);
    }

    return { plan: planModel };
  }

  public async ArchiveMultiplePlans(
    data: ArchiveMultiplePlanRequest,
    user: IRedisUserModel
  ) {
    let { planModels } = await CheckUserPermissionForMultiplePlans(
      this,
      data.ids,
      user
    );

    planModels.forEach((planModel) => {
      planModel.status = PlanStatus.Archived;
    });

    await this.planRepository.Update(
      { Id: In(data.ids), company_id: user.company_id },
      { status: PlanStatus.Archived }
    );

    return { plan: planModels };
  }

  public async UpdatePlanColor(
    planId: number,
    data: UpdatePlanColorRequest,
    user: IRedisUserModel
  ) {
    let { planModel } = await CheckUserPermissionForPlanEdit(this, planId, user);

    planModel.color = data.color;
    await this.planRepository.Update(
      { Id: planId, company_id: user.company_id },
      { color: data.color }
    );

    this.ManageColor(data.color, user.company_id);

    return { plan: planModel };
  }

  public async DeletePlan(planId: number, user: IRedisUserModel) {
    await CheckUserPermissionForPlanEdit(this, planId, user);

    await this.communicationRepository.Delete(
      {
        plan_id: planId,
        company_id: user.company_id,
      },
      false
    );
    await Promise.all([
      this.planRepository.DeleteById(planId, false),
      this.notificationRuleRepository.Delete(
        { entity: NotificationRuleEntity.Plan, entity_id: planId },
        false
      ),
    ]);
    return null;
  }

  public async GetPlanById(
    planId: number,
    user: IRedisUserModel
  ): Promise<{
      plan: PlanModel,
      folderAncestors: any,
      communicationCount: any,
      commentCount: number
    }> {
    const plan = await this.planRepository.GetPlanById(
      planId,
      user,
      [
        "owner",
        "team",
        "tags",
        "business_areas",
        "strategic_priorities",
        "files",
        "plan_permission",
      ]
    );

    if (!plan) {
      throw new BadRequestException("Plan not found.");
    }

    await CheckUserPermissionForPlan(this, planId, user);

    if (plan.is_confidential) {
      let ownerMatched = plan.owner.filter(
        (ownerUser) => user.Id == ownerUser.Id
      );

      let teamMatched = plan.team.filter((teamUser) => user.Id == teamUser.Id);

      if (
        !ownerMatched.length &&
        !teamMatched.length &&
        user.role != UserRoles.Owner
      ) {
        throw new BadRequestException("You don't have access to this plan.");
      }
    }

    await this.UpdateEntityFilesSignedUrl([plan]);

    const [communicationCount, folderAncestors, commentCount] = await Promise.all([
      this.planRepository.GetPlanCommunicationCount([planId], user),
      this.parentFolderRepository.GetFolderAncestors(
        plan.parent_folder_id, 
        plan.company_id
      ),
      this.commentRepository.Count({
        plan_id: plan.Id,
        company_id: user.company_id,
      })
    ]);

    return {
      plan: plan,
      folderAncestors: folderAncestors,
      communicationCount: communicationCount[0],
      commentCount
    };
  }

  public async GetPlans(
    data: GetPlanRequest,
    user: IRedisUserModel
  ): Promise<{
    plans: number | Array<any>;
    count: number | Array<any>;
    page: number;
    limit: number;
  }> {
    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }

    let [plans, count] = await this.planRepository.GetPlans(
      data,
      user,
    );

    if (data.add_communication_info) {
      const comms = await this.communicationRepository.GetCommunicationsByDateRange(
        { ...data, plan_id: plans.map(({ Id }) => Id) },
        user,
      );
  
      if (comms?.length) {
        const planMap: Record<number, any> = {};
        plans.forEach((plan) => {
          planMap[plan.Id] = [];
        });
        comms.forEach(comm => {
          if (planMap[comm.plan_id]) {
            planMap[comm.plan_id].push(comm);
          }
        });
        plans.forEach(plan => {
          plan.communications = planMap[plan.Id];
        });
      }
    }

    await this.UpdateEntityFilesSignedUrl(plans);

    return {
      plans: plans,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async GetPlansAndComms(user: IRedisUserModel): Promise<{
    plans: number | Array<any>;
    count: number | Array<any>;
  }> {
    const [plans, count] = await this.planRepository.GetPlansAndComms(user);
    await this.UpdateEntityFilesSignedUrl(plans);
    return { plans: plans, count: count };
  }

  public async GetCommunicationsByPlanId(
    planId: number,
    data: GetPlanCommunicationsRequest,
    user: IRedisUserModel
  ): Promise<{
    communications: number | Array<CommunicationModel>;
    count: number | any[];
    page: number;
    limit: number;
  }> {
    await CheckUserPermissionForPlan(this, planId, user);

    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }

    data = await AddBusinessAreaRestriction(this, data, user);
    let [communications, count] =
      await this.communicationRepository.GetCommunicationsByPlanId(
        user,
        planId,
        data
      );
    communications = await Promise.all(
      communications.map(async (comm: CommunicationModel) => {
        if (comm.owner?.image_url) {
          comm.owner.image_url = await GetAWSSignedUrl(GetFileKey(comm.owner?.image_url));
        }

        if (comm.team?.length) {
          comm.team = await Promise.all(
            comm.team.map(async (teamMember: UserModel) => {
              if (teamMember.image_url) {
                teamMember.image_url = await GetAWSSignedUrl(GetFileKey(teamMember.image_url));
              }
              return teamMember;
            })
          );
        }

        delete comm["total_count"];
        return comm;
      })
    );

    return {
      communications: communications,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async DeletePlans(data: DeletePlanRequest, user: IRedisUserModel) {
    await CheckUserPermissionForMultiplePlans(this, data.ids, user);

    await this.communicationRepository.Delete(
      { plan_id: In(data.ids), company_id: user.company_id },
      false
    );
    await this.planRepository.DeleteByIds(data.ids, false);
    return null;
  }

  public async GetPlansCountByDateRange(data, user: IRedisUserModel) {
    let PlanCount = await this.planRepository.GetPlansCountByDateRange(
      data,
      user
    );
    return PlanCount;
  }

  public async GetMostActivePlans(
    data: PaginationParam,
    user: IRedisUserModel,
    subdomain: string
  ) {
    let [plans, communicationCount] =
      await this.planRepository.GetMostActivePlans(
        data,
        user,
        GetPaginationOptions(data),
        subdomain,
      );
    await this.UpdateEntityFilesSignedUrl(plans);
    return { plans, communicationCount };
  }

  public async UploadFiles(planId: number, files, user: IRedisUserModel) {
    if (!files.length) {
      return { files: [] };
    }

    let plan: PlanModel;
    const pp = await CheckUserPermissionForPlan(
      this,
      planId,
      user
    );

    if (pp && pp.plan) {
      plan = pp.plan;
    } else {
      plan = await this.planRepository.FindOne({ Id: planId, company_id: user.company_id });
    }

    if (!plan) {
      throw new BadRequestException("Plan not found.");
    }

    let fileModels = await this.fileService.CreateMultiple(files, user);

    let planFilesModels = [];
    for (let index = 0, len = fileModels.length; index < len; index++) {
      let planFilesModel = new PlanFilesModel();
      planFilesModel.plan_id = plan.Id;
      planFilesModel.file = fileModels[index];
      planFilesModels.push(planFilesModel);
    }
    await this.planFilesRepository.CreateAll(planFilesModels);

    for (let index = 0, len = planFilesModels.length; index < len; index++) {
      await this.UpdateFile(planFilesModels[index].file);
    }

    return { files: planFilesModels };
  }

  public async AddFiles(
    planId: number,
    data: AddFileRequest,
    user: IRedisUserModel
  ) {
    if (!data.files || !data.files.length) {
      return { files: [] };
    }

    let plan: PlanModel;
    const pp = await CheckUserPermissionForPlan(
      this,
      planId,
      user
    );

    if (pp && pp.plan) {
      plan = pp.plan;
    } else {
      plan = await this.planRepository.FindOne({ Id: planId, company_id: user.company_id });
    }

    if (!plan) {
      throw new BadRequestException("Plan not found.");
    }

    let fileModels = await this.fileService.CreateMultiple(data.files, user);

    let planFilesModels = [];
    for (let index = 0, len = fileModels.length; index < len; index++) {
      let planFilesModel = new PlanFilesModel();
      planFilesModel.plan_id = plan.Id;
      planFilesModel.file = fileModels[index];
      planFilesModels.push(planFilesModel);
    }
    await this.planFilesRepository.CreateAll(planFilesModels);

    for (let index = 0, len = planFilesModels.length; index < len; index++) {
      await this.UpdateFile(planFilesModels[index].file);
    }

    return { files: planFilesModels };
  }

  public async DeletePlanFile(planFileId: number, user: IRedisUserModel) {
    let planFile = await this.planFilesRepository.FindById(planFileId);

    if (!planFile) {
      throw new BadRequestException("File not Found.");
    }
    await CheckUserPermissionForPlan(
      this,
      planFile.plan_id,
      user
    );

    await this.planFilesRepository.Delete({ Id: planFileId }, false);
    await this.fileService.DeleteFile(planFile.file);
    return null;
  }

  public async UpdatePlanFile(
    planFileId: number,
    data: FileTypeRequest,
    user: IRedisUserModel
  ) {
    let planFile = await this.planFilesRepository.FindById(planFileId);

    if (!planFile) {
      throw new BadRequestException("File not Found.");
    }

    await CheckUserPermissionForPlan(
      this,
      planFile.plan_id,
      user
    );

    planFile.file.name = data.name;
    planFile.file.path = data.path;

    await this.fileService.Update(planFile.file_id, data);

    return planFile;
  }

  public async SearchPlans(
    data: PlanSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    plans: Array<PlanModel>;
    count: number;
    page: number;
    limit: number;
  }> {
    const [plans, count] = await this.planRepository.SearchPlans(data, user);
    return { plans: plans, count, page: data.page, limit: data.limit };
  }

  public async PlanAndCommunicationSearch(
    data: PlanAndCommunicationSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    result: Array<any>;
    page: number;
    limit: number;
    count: number;
  }> {
    const search = await this.planRepository.PlanAndCommunicationSearch(
      data,
      user
    );

    const joinedEntities = [
      "sp_match",
      "ba_match",
      "channel_match",
      "location_match",
      "audience_match",
      "ct_match",
      "tag_match",
      "owner_match",
      "team_match",
    ];

    // Split concatenated names (used string_agg())
    // and filter out only the names that matched of joined entities
    search.result.map((row) => {
      for (let key in row) {
        if (joinedEntities.includes(key) && row[key] != null) {
          row[key] = row[key]
            .split(" ω ")
            .filter((name) => name.includes("<b>"));
        }
      }
    });

    return {
      result: search.result,
      page: data.page,
      limit: data.limit,
      count: search.count,
    };
  }

  public async PlanColors(
    user: IRedisUserModel
  ): Promise<{ colors: Array<string> }> {
    const colorsModel = await this.colorRepository.Find({
      company_id: user.company_id,
    });
    const colors = colorsModel.map((cm) => cm.color);

    return { colors: colors };
  }

  public async GetUsersByPlanId(
    planId: number,
    data: GetUsersByPlanIdRequest,
    user: IRedisUserModel
  ): Promise<Array<UserModel>> {
    await CheckUserPermissionForPlan(this, planId, user);
    if (data.business_area || data.communication_id) {
      const businessAreas = await this.businessAreaService.GetAncestors(
        { ...data, business_areas: data.business_area },
      );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }
    const users = await this.planRepository.FindPlanUsers(
      planId,
      data,
      user.company_id
    );

    await Promise.all(users.map(async (user) => {
      if (user.image_url) {
        const key = GetFileKey(user.image_url);
        user.image_url = await GetAWSSignedUrl(key);
      }
    }));

    return users;
  }

  public async GetBusinessAreasByPlanId(
    planId: number,
    data: UserBusinessAreasSearchRequest,
    user: IRedisUserModel
  ): Promise<Array<BusinessAreaModel>> {
    const planPermissionModel = await CheckUserPermissionForPlan(
      this,
      planId,
      user
    );
    const businessAreas = await this.businessAreaService.GetPlanBusinessAreas(
      planId,
      data,
      user
    );
    return businessAreas;
  }

  public async GetGanttChartData(
    data: GetGanttChartRequest,
    user: IRedisUserModel
  ): Promise<{
    plans: number | Array<any>;
    communicationCount: number | Array<any>;
    tasks: number | Array<any>;
    social_posts: number | Array<any>;
  }> {
    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }
    const [{ plans, count }, tasks, socialPosts] = await Promise.all([
      this.planRepository.GetGanttChartData(data, user),
      this.taskRepository.GetTasksByDateRange(data, user),
      this.socialPostRepository.GetPostsByDateRange(data, user),
    ]);

    return {
      plans: plans,
      communicationCount: count,
      tasks: tasks,
      social_posts: socialPosts,
    };
  }

  public async GetGanttChartCommunicationsByPlanId(
    planId: number,
    data: GetGanttChartRequest,
    user: IRedisUserModel
  ): Promise<{
    communications: number | Array<any>;
    count: number | Array<any>;
  }> {
    const planPermissionModel = await CheckUserPermissionForPlan(
      this,
      planId,
      user
    );

    if (data["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locations.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreas.map(({ Id }) => Id);
    }
    const [communications, count] =
      await this.communicationRepository.GetGanttChartCommunicationsByPlanId(
        user,
        planId,
        data
      );
    await this.UpdateEntityFilesSignedUrl(communications);
    return { communications: communications, count: count };
  }

  public async DuplicatePlanById(
    planId: number,
    data: DuplicatePlanRequest,
    user: IRedisUserModel
  ) {
    await CheckUserPermissionForPlanEdit(this, planId, user);

    const [plan, company, planTaskCount] = await Promise.all([
      this.planRepository.GetPlanById(
        planId,
        user,
        [
          "owner",
          "team",
          "user_setting",
          "business_areas",
          "tags",
          "strategic_priorities",
          "files",
          "budgets",
          "plan_on_page",
        ],
        false
      ),
      this.companyService.GetCompanyWithCounts(user.company_id),
      this.taskRepository.Count({ plan_id: planId }),
    ]);

    if (!plan) {
      throw new BadRequestException("Plan Not Found.");
    }

    if (company.plan_count >= company.subscription.features.plan_limit) {
      throw new BadRequestException("Plan limit exceeded.");
    }

    let planCommunications =
      await this.communicationRepository.GetCommunicationsByPlanIdToDuplicate(
        user,
        plan.Id
      );

    if (
      company.communication_count + planCommunications.length >=
      company.subscription.features.communication_limit
    ) {
      throw new BadRequestException("Communication limit exceeded.");
    }

    if (
      data.duplicate_task &&
      company.task_count + planTaskCount >
        company.subscription.features.task_limit
    ) {
      throw new BadRequestException("Task limit exceeded.");
    }

    let planModel = new PlanModel();
    planModel.company_id = user.company_id;
    planModel.title = data.title;
    planModel.start_date = data.start_date;
    planModel.ongoing = data.ongoing;
    planModel.show_on_calendar = plan.show_on_calendar;
    planModel.end_date = data.ongoing ? null : data.end_date;
    planModel.description = plan.description;
    planModel.key_messages = plan.key_messages;
    planModel.objectives = plan.objectives;
    planModel.budget_actual = plan.budget_actual;
    planModel.color = data.color ?? plan.color;
    planModel.status = plan.status || PlanStatus.InProgress;
    planModel.is_confidential = plan.is_confidential;
    planModel.dashboard_enabled = plan.dashboard_enabled;
    planModel.hide_budget = plan.hide_budget;

    planModel.owner = plan.owner;
    planModel.tags = plan.tags;
    planModel.team = plan.team;
    planModel.business_areas = plan.business_areas;
    planModel.strategic_priorities = plan.strategic_priorities;
    planModel.parent_folder_id = plan.parent_folder_id;
    
    const newPlan = await this.planRepository.Create(planModel, user.Id);

    const budgetModels = plan.budgets.map((budget) => {
      const budgetModel = new BudgetModel();
      budgetModel.company_id = user.company_id;
      budgetModel.plan_id = newPlan.Id;
      budgetModel.name = budget.name;
      budgetModel.actual = budget.actual;
      budgetModel.planned = budget.planned;
      return budgetModel;
    });

    const newBudgetsPromise = this.budgetRepository.CreateAll(budgetModels);


    if (data.duplicate_files && plan.files.length) {
      const fileModels = await this.fileService.CreateMultiple(
        plan.files.map(({ file }) => file), 
        user
      );

      const planFilesModels = [];
      fileModels.forEach((fileModel) => {
        const planFilesModel = new PlanFilesModel();
        planFilesModel.plan_id = planModel.Id;
        planFilesModel.file = fileModel;
        planFilesModels.push(planFilesModel);
      })
      await this.planFilesRepository.CreateAll(planFilesModels);
  
      planFilesModels.forEach(async (planFileModel) => {
        await this.UpdateFile(planFileModel.file);
      })
      newPlan.files = planFilesModels;
    }

    const planStartDate = moment(plan.start_date);

    let planTasksPromise;
    if (data.duplicate_task) {
      const { tasks: planTasks } = await this.taskRepository.GetTasksForKanban(
        { 
          plan_ids: [plan.Id],
          show_plan_tasks_only: true,
        } as GetTasksForKanbanRequest,
        user
      );

      const taskModels = planTasks.map((task) => {
        const taskModel = new TaskModel();
        taskModel.company_id = task.company_id;
        taskModel.name = task.name;
        taskModel.description = task.description;
        taskModel.status = TaskStatus.Todo;
        taskModel.assigned_to = task.assigned_to;
        taskModel.tags = task.tags;
        taskModel.plan_id = newPlan.Id;
        const oldTaskDueDate = moment(task.due_date);
        const newTaskDueDate = moment(newPlan.start_date).add(
          oldTaskDueDate.diff(planStartDate, "days"),
          "days"
        );
        taskModel.due_date = newTaskDueDate.toDate();
        return taskModel;
      });

      planTasksPromise = this.taskRepository.CreateAll(taskModels);
    }

    if (data.duplicate_plan_on_page && plan.plan_on_page) {
      const planOnPage = new PlanOnPageModel();
      planOnPage.plan_id = newPlan.Id;
      planOnPage.purpose = plan.plan_on_page.purpose;
      planOnPage.audience = plan.plan_on_page.audience;
      planOnPage.objectives = plan.plan_on_page.objectives;
      planOnPage.barriers = plan.plan_on_page.barriers;
      planOnPage.messaging = plan.plan_on_page.messaging;
      planOnPage.how = plan.plan_on_page.how;
      planOnPage.stakeholders = plan.plan_on_page.stakeholders;
      planOnPage.impact = plan.plan_on_page.impact;
      planOnPage.reaction = plan.plan_on_page.reaction;

      await this.planOnPageRepository.Save(planOnPage);
      newPlan.plan_on_page = planOnPage;
    }

    this.SendPlanDuplicateNotification(
      newPlan,
      plan.title,
      [...plan.owner, ...plan.team],
    );

    await Promise.all([
      this.GeneratePlanPermissionByPlan(newPlan.Id, user),
      planTasksPromise,
    ]);
    // await this.GeneratePlanPermission(plan);

    const planPermission = await this.planPermissionRepository.FindOne({
      user_id: user.Id,
      plan_id: newPlan.Id,
    });

    newPlan.plan_permission = [planPermission];

    let communications = [];

    if (Array.isArray(planCommunications))
      for (
        let index = 0, len = planCommunications.length;
        index < len;
        index++
      ) {
        let comm: CommunicationModel = planCommunications[index];

        let communicationModel = new CommunicationModel();
        communicationModel.company_id = user.company_id;
        communicationModel.plan_id = newPlan.Id;
        communicationModel.title = comm.title;
        communicationModel.owner_id = comm.owner_id;
        communicationModel.team = comm.team;
        communicationModel.tags = comm.tags;
        communicationModel.strategic_priorities = comm.strategic_priorities;
        communicationModel.description = comm.description;
        communicationModel.key_messages = comm.key_messages;
        communicationModel.objectives = comm.objectives;
        communicationModel.show_on_calendar = comm.show_on_calendar;

        let commStartDate = moment(comm.start_date);
        let newCommStartDate = moment(newPlan.start_date);
        newCommStartDate.add(
          Math.floor(
            moment.duration(commStartDate.diff(planStartDate)).asDays()
          ),
          "days"
        );

        let commEndDate = moment(comm.end_date);
        let newCommEndDate = moment(newPlan.start_date);
        newCommEndDate.add(
          Math.floor(moment.duration(commEndDate.diff(planStartDate)).asDays()),
          "days"
        );

        communicationModel.start_date = new Date(
          newCommStartDate.format("YYYY-MM-DD")
        );
        communicationModel.end_date = new Date(
          newCommEndDate.format("YYYY-MM-DD")
        );
        communicationModel.full_day = comm.full_day;
        communicationModel.no_set_time = comm.no_set_time;

        if (!comm.no_set_time) {
          communicationModel.start_time = comm.start_time;
          communicationModel.end_time = comm.end_time;
        }

        communicationModel.business_areas = comm.business_areas;
        communicationModel.audiences = comm.audiences;
        communicationModel.channels = comm.channels;
        communicationModel.locations = comm.locations;
        communicationModel.status =
          comm.status || CommunicationStatus.InProgress;


        if (comm.budget) {
          const budgetModel = new BudgetModel();
          budgetModel.company_id = user.company_id;
          budgetModel.plan_id = newPlan.Id;
          budgetModel.name = comm.budget.name;
          budgetModel.actual = comm.budget.actual;
          budgetModel.planned = comm.budget.planned;
          communicationModel.budget = budgetModel;
        }

        if (data.duplicate_task) {
          let commTasks = await this.taskRepository.GetTasksByCompanyId(
            user.company_id,
            comm.Id
          );

          communicationModel.tasks = [];
          commTasks.forEach((task) => {
            let taskModel = new TaskModel();
            taskModel.company_id = task.company_id;
            taskModel.name = task.name;
            taskModel.description = task.description;
            taskModel.status = TaskStatus.Todo;
            taskModel.assigned_to = task.assigned_to;
            taskModel.tags = task.tags;
            taskModel.plan_id = newPlan.Id;

            let taskDueDate = moment(communicationModel.start_date);
            let newtaskDueDate = moment(comm.start_date);
            newtaskDueDate.add(
              Math.floor(
                moment.duration(taskDueDate.diff(commStartDate)).asDays()
              ),
              "days"
            );

            taskModel.due_date = new Date(newtaskDueDate.format("YYYY-MM-DD"));

            communicationModel.tasks.push(taskModel);
          });
        }
        
        if (data.duplicate_files || true) {
          communicationModel.files = [];
          comm.files?.forEach((fileModel: any) => {
            const newCommFile = new CommunicationFilesModel();
            newCommFile.communication_id = communicationModel.Id;
            newCommFile.file = fileModel;
            delete newCommFile.file.Id;
            newCommFile.file.created_by = user.Id;
            newCommFile.file.created_at = Date.now();
            communicationModel.files.push(newCommFile);
          });
        }

        communications.push(communicationModel);
      }

    const [newCommunications] = await Promise.all([
      this.communicationRepository.SaveAll(
        communications
      ),
      newBudgetsPromise,
    ]);

    newPlan.communications = newCommunications;

    this.UpdateEntityCountsOnActiveCampaign(user.company_id);

    const generateCommPermissionPromises = newCommunications.map((newComm) => {
      this.GenerateCommunicationPermission(newComm.Id, user);
      if (data.duplicate_files && newComm.files.length) {
        this.createCommunicationFiles(
          newComm.files.map(({ file }) => file),
          user,
          newComm,
        );
      }
    });

    await Promise.all([generateCommPermissionPromises]);

    return newPlan;
  }

  public async GetExcelReport(data, user: IRedisUserModel, subdomain: string) {
    let businessAreaText = DomainConstants[subdomain].BusinessArea;
    let locationText = DomainConstants[subdomain].Location;
    let businessAreasIds = [];
    let locationsIds = [];
    if (data["location"]) {
      locationsIds = data.location;
      let locationFilter = await this.locationService.GetAllLocationsLevels(
        data.location,
        user.company_id
      );
      data.location = locationFilter.map(({ Id }) => Id);
    }
    if (data["business_area"]) {
      businessAreasIds = data.business_area;
      let businessAreaFilter =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          data.business_area,
          user.company_id
        );
      data.business_area = businessAreaFilter.map(({ Id }) => Id);
    }
    let userList = [];
    if (data["owner"]) {
      userList = [...userList, ...data.owner];
    }
    if (data["team"]) {
      userList = [...userList, ...data.team];
    }

    const [plans] = await this.planRepository.GetPlans(
      Object.assign({}, data),
      user
    );

    let planIds = plans.map(({ Id }) => Id);

    const [
      planFilter,
      comms,
      userFilter,
      businessAreaFilter,
      locationFilter,
      tagFilter,
      channelFilter,
      audienceFilter,
      strategicPriorityFilter,
      parentFolderFilter,
      contentTypeFilter,
      companyModel,
    ] = await Promise.all([
      this.fetchPlan(data["plan_id"], user.company_id, ["title"]),
      this.communicationRepository.GetCommunicationsByDateRange(
        {...data, plan_id: planIds},
        user,
        [
          "business_areas",
          "location",
          "audiences",
          "channels",
          "content_type",
          "strategic_priorities",
          "tag",
          "owner",
        ]
      ),
      this.userService.fetchTeam(userList, user.company_id, ["full_name"]),
      this.businessAreaService.fetchBusinessAreas(
        businessAreasIds,
        user.company_id,
        ["name"]
      ),
      this.locationService.fetchLocations(locationsIds, user.company_id, [
        "name",
      ]),
      this.tagService.fetchTags(data["tag"], user.company_id, ["name"]),
      this.channelService.fetchChannels(data["channel"], user.company_id, [
        "name",
      ]),
      this.audienceService.fetchAudience(data["audience"], user.company_id, [
        "name",
      ]),
      this.strategicPriorityService.fetchStrategicPriorities(
        data["strategic_priority"],
        user.company_id,
        ["name"]
      ),
      this.parentFolderRepository.fetchParentFolder(
        data["parent_folder_id"],
        user.company_id,
        ["name"]
      ),
      this.contentTypeService.fetchContentType(
        data["content_type"],
        user.company_id,
        ["name"]
      ),
      this.companyService.GetCompanyWithSelect(user.company_id, [
        "date_format",
        "show_content_type",
      ]),
    ]);

    let workbook = new Excel.Workbook();
    workbook.creator = "System";
    workbook.lastModifiedBy = "System";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    let worksheet = workbook.addWorksheet("Report");
    worksheet.getCell("A1").value = `Report Created`;
    worksheet.getCell("A2").value = `Date Range`;
    worksheet.getCell("B2").value = ChangeDateFormat(data.start_date, companyModel.date_format, "/");
    worksheet.getCell("C2").value = ChangeDateFormat(data.end_date, companyModel.date_format, "/");
    worksheet.getCell("A3").value = `Filter set:`;

    let rowValue = 3;

    if (data["parent_folder_id"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Folder",
        parentFolderFilter
          .filter((pf) => data.parent_folder_id.includes(pf.Id.toString()))
          .map((pf) => pf.name)
          .join(", "),
      ];
    }

    if (data["plan_id"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Plan",
        planFilter
          .filter((plan) => data.plan_id.includes(plan.Id.toString()))
          .map((plan) => plan.title)
          .join(", "),
      ];
    }

    if (data["status"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Status",
        data.status
          .map(
            (status) =>
              statusConfig.plan[subdomain][status] ??
              statusConfig.communication[subdomain][status]
          )
          .join(", "),
      ];
    }

    if (data["owner"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Owner",
        userFilter
          .filter((user) => data.owner.includes(user.Id.toString()))
          .map((user) => user.full_name)
          .join(", "),
      ];
    }

    if (data["business_area"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Business Areas".replace("Business Area", businessAreaText),
        businessAreaFilter
          .filter((ba) => data.business_area.includes(ba.Id.toString()))
          .map((ba) => ba.name)
          .join(", "),
      ];
    }

    if (data["tag"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Tags",
        tagFilter
          .filter((tag) => data.tag.includes(tag.Id.toString()))
          .map((tag) => tag.name)
          .join(", "),
      ];
    }

    if (data["strategic_priority"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Strategic Priorities",
        strategicPriorityFilter
          .filter((sp) => data.strategic_priority.includes(sp.Id.toString()))
          .map((sp) => sp.name)
          .join(", "),
      ];
    }

    if (data["team"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Team",
        userFilter
          .filter((user) => data.team.includes(user.Id.toString()))
          .map((user) => user.full_name)
          .join(", "),
      ];
    }

    if (data["location"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Locations".replace("Location", locationText),
        locationFilter
          .filter((loc) => data.location.includes(loc.Id.toString()))
          .map((loc) => loc.name)
          .join(", "),
      ];
    }

    if (data["audience"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Audience",
        audienceFilter
          .filter((aud) => data.audience.includes(aud.Id.toString()))
          .map((aud) => aud.name)
          .join(", "),
      ];
    }

    if (data["channel"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Channels",
        channelFilter
          .filter((ch) => data.channel.includes(ch.Id.toString()))
          .map((ch) => ch.name)
          .join(", "),
      ];
    }

    if (data["content_type"]) {
      rowValue++;
      worksheet.getRow(rowValue).values = [
        "",
        "Content Type",
        contentTypeFilter
          .filter((ct) => data.content_type.includes(ct.Id.toString()))
          .map((ct) => ct.name)
          .join(", "),
      ];
    }

    const headers = [
      "Plan",
      "Communication",
      "From Date",
      "To Date",
      "Description",
      "Business Areas".replace("Business Area", businessAreaText),
      "Status",
      "Owner",
      "Strategic Priorities",
      "Audience",
      "Channels",
      "Locations".replace("Location", locationText),
      "Tags",
    ];

    const worksheetColumns = [
      { key: "plan" },
      { key: "communication" },
      { key: "fromDate" },
      { key: "toDate" },
      { key: "description" },
      { key: "businessAreas" },
      { key: "status" },
      { key: "owner" },
      { key: "strategicPriorities" },
      { key: "audience" },
      { key: "channels" },
      { key: "locations" },
      { key: "tags" },
    ];

    if (companyModel.show_content_type) {
      headers.push("Content Type");
      worksheetColumns.push({ key: "contentTypes" });
    }

    worksheet.getRow(rowValue + 2).values = headers;
    worksheet.getRow(rowValue + 2).font = { size: 14, bold: true };

    /** Header Row */
    worksheet.columns = worksheetColumns;

    plans.forEach((plan) => {
      const startDate = ChangeDateFormat(plan.start_date, companyModel.date_format, "/");
      const endDate = ChangeDateFormat(plan.end_date, companyModel.date_format, "/");
      const statusDisplayName: PlanStatus = statusConfig.plan[subdomain][plan.status];

      worksheet.addRow({
        plan: plan.title,
        communication: "",
        fromDate: startDate,
        toDate: plan.ongoing ? "Ongoing" : endDate,
        description: htmlToText(plan.description, {
          wordwrap: 130,
        }),
        businessAreas: plan.business_areas.map((ba) => ba.name).join(", "),
        status: statusDisplayName,
        owner: plan.owner.map((po) => po.full_name).join(", "),
        strategicPriorities: plan.strategic_priorities
          .map((sp) => sp.name)
          .join(", "),
        audience: "",
        channels: "",
        locations: "",
        tags: plan.tags.map((t) => t.name).join(", "),
      });

      worksheet.getRow(worksheet.rowCount).font = { size: 12, bold: true };

      let planComms = comms.filter((comm) => comm.plan_id == plan.Id);

      planComms.forEach((comm) => {
        const startDate = ChangeDateFormat(comm.start_date, companyModel.date_format, "/");
        const endDate = ChangeDateFormat(comm.end_date, companyModel.date_format, "/");
        const statusDisplayName: CommunicationStatus = statusConfig.communication[subdomain][comm.status];
  
        const row = {
          plan: "",
          communication: comm.title,
          fromDate: `${startDate} ${
            comm.start_time ? `(${comm.start_time})` : ""
          }`,
          toDate: `${endDate} ${
            comm.end_time ? `(${comm.end_time})` : ""
          }`,
          description: htmlToText(comm.description, {
            wordwrap: 130,
          }),
          businessAreas: comm.business_areas.map((ba) => ba.name).join(", "),
          status: statusDisplayName,
          owner: comm.owner ? comm.owner.full_name : "",
          strategicPriorities: comm.strategic_priorities
            .map((sp) => sp.name)
            .join(", "),
          audience: comm.audiences.map((aud) => aud.name).join(", "),
          channels: comm.channels.map((ch) => ch.name).join(", "),
          locations: comm.locations.map((loc) => loc.name).join(", "),
          tags: comm.tags.map((t) => t.name).join(", "),
        };

        if (companyModel.show_content_type) {
          row["contentTypes"] = comm.content_types
            .map((ct) => ct.name)
            .join(", ");
        }
        worksheet.addRow(row);
      });
    });

    const pass = new stream.PassThrough();
    let responseData = await workbook.xlsx.write(pass).then(async () => {
      return await UploadFileToS3(pass, `${Date.now()}_report.xlsx`);
    });

    let fileModel = await this.fileService.Create(
      {
        size: 0,
        mime_type: "application/vnd.ms-excel",
        location: responseData.Location,
        originalname: responseData.Key,
        is_aws: true,
      },
      user
    );

    await this.UpdateFile(fileModel);

    return fileModel;
  }

  public async AddPlanToFolder(
    planId: number,
    params: AddPlanToFolderRequest,
    user: IRedisUserModel
  ) {
    await CheckUserPermissionForPlanEdit(this, planId, user);

    const plan = await this.planRepository.Update(
      { Id: planId },
      { parent_folder_id: params.parent_folder_id }
    );

    return plan;
  }

  public async GetPlanSocialPosts(
    planId: Number,
    params,
    user: IRedisUserModel
  ) {
    const socialPosts = await this.socialPostRepository.GetPlanSocialPosts(
      planId,
      params,
      user.company_id,
      GetPaginationOptions(params)
    );

    const socialIntegration = await this.socialIntegrationRepository.FindOne(
      {
        user_id: user.Id,
        social_network_type: SocialIntegrationType.Yammer,
      },
      { select: ["Id", "token"] }
    );

    let yammerPost = [];
    if (socialIntegration && socialIntegration.token) {
      const allPromise = socialPosts
        .filter((sp) => sp.status === PostStatus.Published)
        .map((sp) =>
          this.yammerService.GetYammerMessageById(
            sp.post_id,
            socialIntegration.token,
            sp.Id
          )
        );

      yammerPost = await Promise.all(allPromise);
    }

    return { social_posts: socialPosts, yammer_posts: yammerPost };
  }

  public async CheckIfUserInCommunication(
    planId: number,
    userId: number,
    user: IRedisUserModel
  ) {
    const comms = await this.planRepository.CheckIfUserInCommunication(
      planId,
      userId,
      user
    );
    return comms;
  }

  public async GetPlanAndCommunicationFiles(
    planId: number, 
    user: IRedisUserModel
  ) {
    await CheckUserPermissionForPlan(this, planId, user);

    const [plan, communications] = await Promise.all([
      this.planRepository.GetPlanFiles(planId, user),
      this.communicationRepository.GetCommunicationFilesByPlanId(
        planId,
        user
      ),
    ]);

    return { plan, communications };
  }

  public async GetHomePagePlans(
    filters: GetParentFolderAndPlanRequest,
    user: IRedisUserModel,
  ) {
    if (filters["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        filters.location,
        user.company_id
      );
      filters.location = locations.map(({ Id }) => Id);
    }
    if (filters["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          filters.business_area,
          user.company_id
        );
      filters.business_area = businessAreas.map(({ Id }) => Id);
    }

    if (filters.page_type == ParentFolderPage.Homepage) {
      filters.parent_folder_id = filters.parent_folder_id?.length ? [-1] : [0];
    }

    const { plans, count } = await this.planRepository.GetParentFolderPlans(filters, user);

    const communicationCount = await this.planRepository.GetPlanCommunicationCount(
      plans.map((p) => p.Id), 
      user
    );

    return { plans, count, communicationCount };
  }

  public async GetPhasesByPlanId(planId: number) {
    const phases = await this.phaseRepository.GetPhasesByPlanId(planId);

    return phases;
  }

  public async StarPlan(data: StarPlanRequest, planId: number, user: IRedisUserModel) {
    const { planModel } = await CheckUserPermissionForPlanEdit(this, planId, user);

    if (planModel.is_starred == data.is_starred) {
      return planModel;
    }

    if (data.is_starred) {
      // Unstar other plan
      await this.planRepository.Update(
        { company_id: user.company_id, is_starred: true },
        { is_starred: false }
      );
    }

    await this.planRepository.Update(
      { Id: planId, company_id: user.company_id },
      { is_starred: data.is_starred }
    );
    planModel.is_starred = data.is_starred;

    return planModel;
  }

  public async GetPlanOnPage(planId: number, user: IRedisUserModel) {
    await CheckUserPermissionForPlan(this, planId, user);

    const planOnPage = await this.planOnPageRepository.FindOne({
      plan_id: planId,
    });

    return planOnPage;
  }

  public async UpdatePlanOnPage(
    data: UpdatePlanOnPageRequest,
    planId: number,
    user: IRedisUserModel
  ) {
    await CheckUserPermissionForPlanEdit(this, planId, user);

    let planOnPage = await this.planOnPageRepository.FindOne({
      plan_id: planId,
    });

    if (!planOnPage) {
      planOnPage = new PlanOnPageModel();
      planOnPage.plan_id = planId;
    }

    planOnPage.purpose = data.purpose;
    planOnPage.audience = data.audience;
    planOnPage.objectives = data.objectives;
    planOnPage.barriers = data.barriers;
    planOnPage.messaging = data.messaging;
    planOnPage.how = data.how;
    planOnPage.stakeholders = data.stakeholders;
    planOnPage.impact = data.impact;
    planOnPage.reaction = data.reaction;

    await this.planOnPageRepository.Save(planOnPage);

    return planOnPage;
  }

  public async ExportPlanOnPage(planId: number, user: IRedisUserModel, req: Request) {
    await CheckUserPermissionForPlan(this, planId, user);

    const planOnPagePromise = this.planOnPageRepository.FindOne({
      plan_id: planId,
    });

    const culPromise = this.companyUserLicenseRepository.FindOne({
      company_id: user.company_id,
    });

    const [planOnPage, cul] = await Promise.all([
      planOnPagePromise,
      culPromise,
    ]);

    if (!planOnPage) {
      throw new BadRequestException("Plan on page not found.");
    }

    const model = {
      purpose: planOnPage.purpose || "",
      audience: planOnPage.audience || "",
      objectives: planOnPage.objectives || "",
      barriers: planOnPage.barriers || "",
      messaging: planOnPage.messaging || "",
      how: planOnPage.how || "",
      stakeholders: planOnPage.stakeholders || "",
      impact: planOnPage.impact || "",
      reaction: planOnPage.reaction || "",
      purpose_subtitle: cul.pop_subtitles.purpose || "",
      audience_subtitle: cul.pop_subtitles.audience || "",
      objectives_subtitle: cul.pop_subtitles.objectives || "",
      barriers_subtitle: cul.pop_subtitles.barriers || "",
      messaging_subtitle: cul.pop_subtitles.messaging || "",
      how_subtitle: cul.pop_subtitles.how || "",
      stakeholders_subtitle: cul.pop_subtitles.stakeholders || "",
      impact_subtitle: cul.pop_subtitles.impact || "",
      reaction_subtitle: cul.pop_subtitles.reaction || "",
    };

    const pdfBuffer = await ExportPdf(
      "plan-on-a-page.html",
      model,
      CheckSubDomain(req),
      {
        format: "A4",
        landscape: true,
        printBackground: true,
      }
    );

    const responseData = await UploadFileToS3(
      pdfBuffer,
      `${Date.now()}_plan_on_a_page.pdf`
    );

    const fileModel = await this.fileService.Create(
      {
        size: 0,
        mime_type: "application/pdf",
        location: responseData.Location,
        originalname: responseData.Key,
        is_aws: true,
      },
      user
    );

    await this.UpdateFile(fileModel);

    return fileModel;
  }

  public async GetBudgets(planId: number, user: IRedisUserModel) {
    let plan: PlanModel;
    const pp = await CheckUserPermissionForPlan(
      this,
      planId,
      user
    );

    if (pp && pp.plan) {
      plan = pp.plan;
    } else {
      plan = await this.planRepository.FindOne({ Id: planId, company_id: user.company_id });
    }

    if (!plan) {
      throw new BadRequestException("Plan not found.");
    }

    if (plan.hide_budget && user.role != UserRoles.Owner) {
      const planUsers = await this.planRepository.FindPlanUsers(
        planId,
        {},
        user.company_id
      );
      if (!planUsers.find((u) => u.Id == user.Id)) {
        throw new BadRequestException(
          "The user is not allowed to view the budget."
        );
      }
    }

    const budgets = await this.budgetRepository.GetBudgets(planId, user);

    return budgets;
  }

  public async CreatePlanBudget(
    data: CreatePlanBudgetRequest,
    user: IRedisUserModel,
  ) {
    await CheckUserPermissionForPlanEdit(this, data.plan_id, user);

    const budgetModel = new BudgetModel();
    budgetModel.company_id = user.company_id;
    budgetModel.plan_id = data.plan_id;
    budgetModel.name = data.name;
    budgetModel.planned = data.planned;
    budgetModel.actual = data.actual;
  
    const budget = await this.budgetRepository.Create(budgetModel);

    return budget;
  }

  public async UpdatePlanBudget(
    budgetId: number,
    data: UpdatePlanBudgetRequest,
    user: IRedisUserModel,
  ) {
    
    const budget = await this.budgetRepository.FindOne({
      Id: budgetId,
      company_id: user.company_id,
      communication_id: IsNull(),
    });

    if (!budget) {
      throw new BadRequestException("Budget not found.");
    }
    
    await CheckUserPermissionForPlanEdit(this, budget.plan_id, user);

    budget.name = data.name;
    budget.planned = data.planned;
    budget.actual = data.actual;

    await this.budgetRepository.Update(
      { Id: budgetId },
      {
        name: budget.name,
        planned: budget.planned,
        actual: budget.actual
      }
    );

    return budget;
  }

  public async DeleteBudget(
    budgetId: number,
    user: IRedisUserModel,
  ) {
    const budget = await this.budgetRepository.FindOne({
      Id: budgetId,
      company_id: user.company_id,
    });

    if (!budget) {
      throw new BadRequestException("Budget not found.");
    }

    if (budget.communication_id)
      await CheckUserPermissionForCommunicationEdit(this, budget.communication_id, user);
    else
      await CheckUserPermissionForPlanEdit(this, budget.plan_id, user);

    await this.budgetRepository.Delete(budgetId, false);
    return true;
  }

  public async GetPlanRAGBState(
    planId: number,
    companyId: number,
  ): Promise<RAGBStatus> { 
    const plan = await this.planRepository.FindOne(
      {
        Id: planId,
        company_id: companyId,
      },
      { relations: ["team"] },
    );

    const planTimePassed = GetTimePercentagePassed(
      plan.start_date,
      plan.end_date
    );

    const commOverduePercentagePr =
      this.communicationRepository.GetCommOverduePercentage(plan.Id);
    const planActualAndPlannedBudgetPr =
      this.budgetRepository.GetPlanActualAndPlannedBudget(plan.Id);

    const risksPr = this.riskRepository.GetRisks(
      { plan_id: plan.Id } as any,
      companyId
    );

    const phasesPr = this.phaseRepository.GetPhasesByPlanId(plan.Id);

    const commCountPr = this.communicationRepository.Count({ plan_id: plan.Id });

    const [
      commOverduePercentage,
      planActualAndPlannedBudget,
      { risk: risks },
      phases,
      commCount,
    ] = await Promise.all([
      commOverduePercentagePr,
      planActualAndPlannedBudgetPr,
      risksPr,
      phasesPr,
      commCountPr,
    ]);

    const materializedRiskScore = risks.reduce(
      (acc: number, risk: RiskModel) =>
        risk.status == RiskStatus.Materialized
          ? acc + risk.impact * risk.likelihood
          : acc,
      0
    );

    const isRiskCleared = !risks.find(
      (risk: RiskModel) =>
        ![RiskStatus.Deferred, RiskStatus.Resolved, RiskStatus.Closed].includes(
          risk.status
        )
    );

    planActualAndPlannedBudget.planned ||= planActualAndPlannedBudget.actual;
    const actualBudgetPercentage =
      (planActualAndPlannedBudget.actual / planActualAndPlannedBudget.planned) *
      100;

    const isRed =
      commOverduePercentage > 50 ||
      (plan.status != PlanStatus.Complete && planTimePassed == 100) ||
      actualBudgetPercentage > 120 ||
      materializedRiskScore > 50 ||
      (phases.length && !phases.find((phase) => phase.status == PhaseStatus.Complete) &&
        planTimePassed == 100);

    const isAmber =
      (commOverduePercentage >= 20 && commOverduePercentage <= 50) ||
      (plan.status != PlanStatus.Complete &&
        planTimePassed >= 30 &&
        commCount == 0) ||
      (actualBudgetPercentage >= 110 && actualBudgetPercentage <= 120) ||
      (materializedRiskScore >= 30 && materializedRiskScore <= 50) ||
      (phases.length >= 4 &&
        !phases.find((phase) => phase.status == PhaseStatus.InProgress) &&
        planTimePassed >= 50);

    const isGreen =
      commOverduePercentage < 20 &&
      plan.status == PlanStatus.InProgress &&
      planTimePassed < 100 &&
      plan.team.length &&
      actualBudgetPercentage < 110 &&
      materializedRiskScore < 30;

    const isBlue =
      commOverduePercentage == 0 &&
      [PlanStatus.Archived, PlanStatus.Complete].includes(plan.status) &&
      isRiskCleared &&
      !phases.find((phase) => phase.status != PhaseStatus.Complete);

    if (isRed) return RAGBStatus.Red;
    if (isAmber) return RAGBStatus.Amber;
    if (isGreen) return RAGBStatus.Green;
    if (isBlue) return RAGBStatus.Blue;

    return null;
  }

  public async GetAnalyticsProgressTracker(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {
    const progressTracker = await this.planRepository.GetAnalyticsProgressTracker(
      data,
      user
    );

    return progressTracker;
  }

  public async GetAnalyticsBudget(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {
    const { total_planned, total_actual } = await this.budgetRepository.GetCompanyActualAndPlannedBudget(
      data,
      user
    );

    return {
      total_planned: total_planned.toFixed(2),
      total_actual: total_actual.toFixed(2),
    };
  }

  public async UpdatePlanRAGBStatus(plans: Array<{ Id: number, company_id: number}>) {
    const planRagbStatuses = await Promise.all(
      plans.map(async (plan) => {
        const planRAGBState = await this.GetPlanRAGBState(plan.Id, plan.company_id);
        return {
          Id: plan.Id,
          ragb_status: planRAGBState,
        };
      })
    );

    if (!planRagbStatuses.length) {
      return true;
    }
    await this.planRepository.BulkUpdatePlanRAGB(planRagbStatuses);

    return;
  }

  public async ForceRefreshRAGB(
    planId: number,
    user: IRedisUserModel
  ): Promise<{
    ragb_status: RAGBStatus;
    ragb_last_updated: Date;
  }> {
    const pp = await CheckUserPermissionForPlan(this, planId, user);

    if (!pp) {
      throw new BadRequestException("Plan not found.");
    }
    const newStatus = await this.GetPlanRAGBState(planId, user.company_id);
    await this.planRepository.Update(
      { Id: planId, company_id: user.company_id },
      { 
        ragb_status: newStatus,
        ragb_last_updated: () => "CURRENT_TIMESTAMP",
        updated_by: user.Id,
        updated_at: Date.now(),
      }
    );
    return {
      ragb_status: newStatus,
      ragb_last_updated: new Date(),
    };
  }

  public async GetCompanyRAGBStatus(data: AnalyticsRequest, user: IRedisUserModel): Promise<RAGBStatus> {
    return await this.planRepository.GetCompanyRAGBStatus(data, user);
  }
}