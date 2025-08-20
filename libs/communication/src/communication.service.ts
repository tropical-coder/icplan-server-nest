import { UserBusinessAreaPermissionRepository } from '../../repository/user/business_area_permission/UserBusinessAreaPermissionRepository';
import { BadRequestException, HttpError } from "routing-controllers";
import { CommunicationRepository } from "../../repository/communication/CommunicationRepository";
import { PlanRepository } from "../../repository/plan/PlanRepository";
import { UserRepository } from "../../repository/user/UserRepository";
import { TaskRepository } from "../../repository/task/TaskRepository";
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { CommunicationPermissionRepository } from "../../repository/communication/CommunicationPermissionRepository";
import { CommunicationFilesRepository } from "../../repository/communication/CommunicationFilesRepository";
import { SocialPostRepository } from "../../repository/social-post/SocialPostRepository";

import {
  CommunicationModel,
  CommunicationSelectable,
  CommunicationStatus,
} from "../../model/communication/CommunicationModel";
import {
  CreateCommunicationRequest,
  UpdateCommunicationRequest,
  UpdateCommunicationInlineRequest,
  CommunicationSearchRequest,
  DeleteCommunicationRequest,
  UpdateCommunicationBudgetRequest,
  UpdateTaskPositionRequest,
  UpdateCommunicationInSwimlaneRequest,
  UpdateCommunicationStatusRequest,
  GenerateWeeklyReportRequest,
} from "../../../api/controller/communication/CommunicationRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import {
  CalculateCommunicationSpan,
  ChangeDateFormat,
  DeepClone,
  GetPaginationOptions,
  ReadDocxTemplate,
  SnakeCaseToNormal,
} from "../../helpers/UtilHelper";
import { In, MoreThanOrEqual } from "typeorm";
import {
  UserRoles,
  UserModel,
  IRedisUserModel,
} from "../../model/user/UserModel";
import { AudienceService } from "../audience/AudienceService";
import { ChannelService } from "../channel/ChannelService";
import { LocationService } from "../location/LocationService";
import { FileService } from "../file/FileService";
import { TagService } from "../tag/TagService";
import { StrategicPriorityService } from "../strategic_priority/StrategicPriorityService";
import { BusinessAreaService } from "../business_area/BusinessAreaService";
import { YammerService } from "../social/yammer/YammerService";
import { CommunicationFilesModel } from "../../model/communication/CommunicationFilesModel";
import { TaskModel, TaskStatus } from "../../model/task/TaskModel";
import moment = require("moment");
import { UserPermission } from "../../model/user/business_area_permission/UserBusinessAreaPermissionModel";
import {
  AddBusinessAreaRestriction,
  CheckUserPermissionForPlan,
  CheckUserPermissionForBusinessAreas,
  CheckUserPermissionForMultipleCommunications,
  CheckUserPermissionForCommunicationEdit,
  CheckUserPermissionForCommunication,
} from "../../helpers/PermissionHelper";
import { GetAWSSignedUrl, GetFileKey, UploadFileToS3 } from "../aws/MediaService";
import { SocialIntegrationType } from "../../model/social-intergration/SocialIntegrationModel";
import { SocialIntegrationRepository } from "../../repository/social_integration/SocialIntegrationRepository";
import { PostStatus } from "../../model/social-post/SocialPostModel";
import { RedisRepository } from "../../repository/RedisRepository";
import {
  AddFileRequest,
  FileTypeRequest,
} from "../../../api/controller/plan/PlanRequest";
import { ResponseCode } from "../../helpers/ServerResponse";
import { DomainConstants } from "../../constant/DomainConstants";
import { ContentTypeService } from "../content_type/ContentTypeService";
import { NotificationService } from "../notification/NotificationService";
import { NotificationConstants } from "../../constant/NotificationConstants";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { INotificationModel } from "../../model/notification/NotificationModel";
import * as RRule from "rrule";
import { UpdateCommunicationRRule } from "../../../api/controller/communication/RecurringCommunicationRequest";
import { appEnv } from "../../helpers/EnvHelper";
import { PlanModel } from "../../model/plan/PlanModel";
import { ParentFolderRepository } from "../../repository/parent_folder/ParentFolderRepository";
import { ParentFolderModel } from "../../model/parent_folder/ParentFolderModel";
import { SwimlaneGroupBy } from "../../../api/controller/calendar/CalendarRequest";
import { CommunicationGridModel } from "../../model/communication/CommunicationGridModel";
import { CommunicationGridRepository } from "../../repository/communication/CommunicationGridRepository";
import { AudienceModel } from "../../model/audience/AudienceModel";
import { ChannelModel } from "../../model/channel/ChannelModel";
import { StrategicPriorityModel } from "../../model/strategic_priority/StrategicPriorityModel";
import { CompanyModel } from "../../model/company/CompanyModel";
import { createReport } from 'docx-templates';
import * as fs from "fs";
import { Request } from 'express';
import { htmlToText } from 'html-to-text';
import { ActiveCampaignService } from '../active_campaign/ActiveCampaignService';
import { BudgetModel } from '../../model/budget/BudgetModel';
import { BudgetRepository } from '../../repository/budget/BudgetRepository';
import { statusConfig } from '../../constant/StatusConstant';

@Injectable()
export class CommunicationService {
  constructor(
    private communicationRepository: CommunicationRepository,
    private planRepository: PlanRepository,
    private userRepository: UserRepository,
    private communicationFilesRepository: CommunicationFilesRepository,
    private planPermissionRepository: PlanPermissionRepository,
    private communicationPermissionRepository: CommunicationPermissionRepository,
    private audienceService: AudienceService,
    private channelService: ChannelService,
    private contentTypeService: ContentTypeService,
    private locationService: LocationService,
    private tagService: TagService,
    private strategicPriorityService: StrategicPriorityService,
    private businessAreaService: BusinessAreaService,
    private fileService: FileService,
    private yammerService: YammerService,
    private taskRepository: TaskRepository,
    private socialPostRepository: SocialPostRepository,
    private socialIntergrationRepository: SocialIntegrationRepository,
    private redisService: RedisService,
    private notificationService: NotificationService,
    private companyRepository: CompanyRepository,
    private parentFolderRepository: ParentFolderRepository,
    private communicationGridRepository: CommunicationGridRepository,
    private userBusinessAreaPermissionRepository: UserBusinessAreaPermissionRepository,
    private activeCampaignService: ActiveCampaignService,
    private budgetRepository: BudgetRepository,
  ) {}

  private async UpdateFile(file) {
    if (file.is_aws) {
      let key = GetFileKey(file.path);
      file.path = await GetAWSSignedUrl(key);
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
        user_ids: [data.owner_id],
        business_areas: businessAreaIds,
        business_area_permission: UserPermission.Edit,
      },
      user
    );

    let teamPromise = this.userRepository.GetUserWithBARights(
      {
        user_ids: data.team,
        business_areas: businessAreaIds,
        is_deleted: false,
      },
      user
    );

    let [owner, team] = await Promise.all([ownerPromise, teamPromise]);

    return { owner, team };
  }

  private async GenerateCommunicationPermission(
    communicationIds: number[],
    user: IRedisUserModel
  ) {
    await this.communicationPermissionRepository.AddOwnerToCommunicationPermission(
      communicationIds,
      user
    );
    await this.communicationPermissionRepository.AddCommunicationUsersPermission(
      communicationIds,
      "edit",
      user
    );
    await this.communicationPermissionRepository.AddCommunicationUsersPermission(
      communicationIds,
      "read",
      user
    );
  }

  private async DeleteCommunicationPermission(communicationId: number) {
    await this.communicationPermissionRepository.Delete(
      { communication_id: communicationId },
      false
    );
  }

  private async SendCommunicationCreationNotification(
    communication: CommunicationModel
  ) {
    const company = await this.companyRepository.FindOne({
      Id: communication.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const ownerAddedConstant: INotificationModel = DeepClone(
      NotificationConstants.CommunicationOwnerAssigned
    );
    ownerAddedConstant.body = ownerAddedConstant.body.replace(
      "{{title}}",
      communication.title
    );
    ownerAddedConstant.info = {
      plan_id: communication.plan_id,
      communication_id: communication.Id,
    };

    await this.notificationService.SendNotification(
      ownerAddedConstant,
      [communication.owner],
      "assignment_notification"
    );

    const teamAddedConstant: INotificationModel = DeepClone(
      NotificationConstants.CommunicationTeamAssigned
    );
    teamAddedConstant.body = teamAddedConstant.body.replace(
      "{{title}}",
      communication.title
    );
    teamAddedConstant.info = {
      plan_id: communication.plan_id,
      communication_id: communication.Id,
    };

    await this.notificationService.SendNotification(
      teamAddedConstant,
      communication.team,
      "assignment_notification"
    );

    return true;
  }

  private async SendStatusChangedNotification(
    communication: CommunicationModel,
    users: UserModel[],
    subdomain: string,
  ) {

    const commStatuses = statusConfig.communication[subdomain] || statusConfig.communication.default;
    const company = await this.companyRepository.FindOne({
      Id: communication.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const constant = DeepClone(
      NotificationConstants.CommunicationStatusChanged
    );
    constant.body = constant.body
      .replace("{{title}}", communication.title)
      .replace(
        "{{status}}",
        commStatuses[communication.status] || communication.status
      );

    constant.info = {
      communication_id: communication.Id,
      plan_id: communication.plan_id,
    };

    await this.notificationService.SendNotification(
      constant,
      users,
      "status_change_notification"
    );

    return true;
  }

  private async SendCommunicationAssigneeChangeNotification(
    communication: CommunicationModel,
    newOwnerAssignees: UserModel[],
    oldOwnerAssignees: UserModel[],
    newTeamAssignees: UserModel[],
    oldTeamAssignees: UserModel[]
  ) {
    const company = await this.companyRepository.FindOne({
      Id: communication.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const data = {
      plan_id: communication.plan_id,
      communication_id: communication.Id,
    };

    if (oldOwnerAssignees.length) {
      const constant = DeepClone(
        NotificationConstants.CommunicationOwnerUnassigned
      );
      constant.body = constant.body.replace("{{title}}", communication.title);
      constant.info = data;

      await this.notificationService.SendNotification(
        constant,
        oldOwnerAssignees,
        "assignment_notification"
      );
    }

    if (oldTeamAssignees.length) {
      const constant = DeepClone(
        NotificationConstants.CommunicationTeamUnassigned
      );
      constant.body = constant.body.replace("{{title}}", communication.title);
      constant.info = data;

      await this.notificationService.SendNotification(
        constant,
        oldTeamAssignees,
        "assignment_notification"
      );
    }

    if (newOwnerAssignees.length) {
      const constant = DeepClone(
        NotificationConstants.CommunicationOwnerAssigned
      );
      constant.body = constant.body.replace("{{title}}", communication.title);
      constant.info = data;

      await this.notificationService.SendNotification(
        constant,
        newOwnerAssignees,
        "assignment_notification"
      );
    }

    if (newTeamAssignees.length) {
      const constant = DeepClone(
        NotificationConstants.CommunicationTeamAssigned
      );
      constant.body = constant.body.replace("{{title}}", communication.title);
      constant.info = data;

      await this.notificationService.SendNotification(
        constant,
        newTeamAssignees,
        "assignment_notification"
      );
    }
    return true;
  }

  private async SendCommunicationDuplicateNotification(
    communication: CommunicationModel,
    oldCommunicationTitle: string,
    users: UserModel[]
  ) {
    const company = await this.companyRepository.FindOne({
      Id: communication.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const constant = DeepClone(NotificationConstants.CommunicationDuplicated);
    constant.body = constant.body
      .replace("{{newTitle}}", communication.title)
      .replace("{{title}}", oldCommunicationTitle);

    constant.info = {
      communication_id: communication.Id,
      plan_id: communication.plan_id,
    };

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

    for (
      let index = 0, len = communicationFilesModels.length;
      index < len;
      index++
    ) {
      await this.UpdateFile(communicationFilesModels[index].file);
    }

    return communicationFilesModels;
  }

  private async CreateRecurringCommunications(
    parent: CommunicationModel,
    dates: Date[],
    span: number,
    user: IRedisUserModel
  ) {
    const recurringComms = dates.map((startDate) => {
      let communicationModel = new CommunicationModel();
      Object.assign(communicationModel, parent);

      communicationModel.Id = null;
      communicationModel.parent_id = parent.Id;
      communicationModel.rrule = null;

      communicationModel.start_date = startDate;
      const endDate = moment(startDate).add(span, "seconds").toDate();
      communicationModel.end_date = endDate;

      if (!parent.no_set_time) {
        communicationModel.start_time = moment(startDate).format("HH:mm:ss");
        communicationModel.end_time = moment(endDate).format("HH:mm:ss");
      }

      return communicationModel;
    });

    const newComms = await this.communicationRepository.SaveAll(recurringComms);
    await this.GenerateCommunicationPermission(
      newComms.map(({ Id }) => Id),
      user
    );

    return newComms;
  }

  private validateRRule(
    parentComm: CommunicationModel,
    rrule: string,
    planModel: PlanModel,
    company: CompanyModel
  ) {
    if (!rrule) {
      return;
    }
    const communicationSpan = CalculateCommunicationSpan(parentComm);
    let startDates: Date[] = [];
    try {
      // Get dates from recursion rule
      startDates = RRule.rrulestr(rrule).all();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    if (!startDates.length) {
      throw new BadRequestException("Invalid rrule string.");
    }

    if (
      company.communication_count + startDates.length >
      company.subscription.features.communication_limit
    ) {
      throw new BadRequestException("Communication limit exceeded.");
    }

    if (startDates.length > +appEnv("MAX_RECURRING_COMMUNICATIONS")) {
      throw new BadRequestException(
        `Recurring communication can't be more than ${appEnv(
          "MAX_RECURRING_COMMUNICATIONS"
        )}.`
      );
    }

    const firstCommStart = startDates[0];
    const lastCommEnd = moment(startDates[startDates.length - 1])
      .add(communicationSpan, "seconds")
      .toDate();

    const planEndDate = new Date(planModel.end_date);
    planEndDate.setHours(23, 59, 59, 999);
    if (
      firstCommStart < new Date(planModel.start_date) ||
      (!planModel.ongoing && lastCommEnd > planEndDate)
    ) {
      throw new BadRequestException(
        "One of the recurring communication is exceeding the plan date range."
      );
    }
  }

  private async generateRecurringCommunications(
    parentComm: CommunicationModel,
    rrule: string,
    user: IRedisUserModel
  ) {
    const communicationSpan = CalculateCommunicationSpan(parentComm);
    let startDates = RRule.rrulestr(rrule).all();

    if (parentComm.rrule) {
      await this.communicationRepository.Delete(
        {
          parent_id: parentComm.Id,
          company_id: user.company_id,
        },
        false
      );
    }

    parentComm.rrule = rrule;
    await Promise.all([
      this.communicationRepository.Update(
        { Id: parentComm.Id },
        { rrule: parentComm.rrule }
      ),
      this.CreateRecurringCommunications(
        parentComm,
        startDates,
        communicationSpan,
        user
      ),
    ]);

    return parentComm;
  }

  private async SendRuleBasedNotification(
    updateComm: CommunicationModel,
    user: IRedisUserModel,
    oldComm?: CommunicationModel
  ) {
    const entityRemovedComm = DeepClone(updateComm),
      entityAddedComm = DeepClone(updateComm);
    if (oldComm) {
      entityRemovedComm.channels = oldComm.channels.filter(
        (channel) =>
          !updateComm.channels.some(
            (updatedChannel) => updatedChannel.Id === channel.Id
          )
      );
      entityAddedComm.channels = updateComm.channels.filter(
        (channel) =>
          !oldComm.channels.some((oldChannel) => oldChannel.Id === channel.Id)
      );

      entityRemovedComm.strategic_priorities =
        oldComm.strategic_priorities.filter(
          (sp) =>
            !updateComm.strategic_priorities.some(
              (updatedSp) => updatedSp.Id === sp.Id
            )
        );
      entityAddedComm.strategic_priorities =
        updateComm.strategic_priorities.filter(
          (sp) =>
            !oldComm.strategic_priorities.some((oldSp) => oldSp.Id === sp.Id)
        );

      entityRemovedComm.audiences = oldComm.audiences.filter(
        (audience) =>
          !updateComm.audiences.some(
            (updatedAudience) => updatedAudience.Id === audience.Id
          )
      );
      entityAddedComm.audiences = updateComm.audiences.filter(
        (audience) =>
          !oldComm.audiences.some(
            (oldAudience) => oldAudience.Id == audience.Id
          )
      );

      entityRemovedComm.tags = oldComm.tags.filter(
        (tag) => !updateComm.tags.some((updatedTag) => updatedTag.Id === tag.Id)
      );
      entityAddedComm.tags = updateComm.tags.filter(
        (tag) => !oldComm.tags.some((oldTag) => oldTag.Id === tag.Id)
      );
    }

    let users = await this.communicationRepository.GetNotificationRuleUsers(
      entityAddedComm,
      user
    );

    users.forEach(async (user) => {
      const constant = DeepClone(
        NotificationConstants.EntityAddedToCommunication
      );
      constant.body = constant.body
        .replace("{{entity}}", SnakeCaseToNormal(user.entity))
        .replace("{{entityName}}", user.entity_name)
        .replace("{{communicationName}}", entityAddedComm.title);

      constant.info = {
        plan_id: entityAddedComm.plan_id,
        communication_id: entityAddedComm.Id,
      };

      await this.notificationService.SendNotification(constant, [user]);
    });

    if (!oldComm) {
      return true;
    }

    users = await this.communicationRepository.GetNotificationRuleUsers(
      entityRemovedComm,
      user
    );

    users.forEach(async (user) => {
      const constant = DeepClone(
        NotificationConstants.EntityRemovedFromCommunication
      );
      constant.body = constant.body
        .replace("{{entity}}", SnakeCaseToNormal(user.entity))
        .replace("{{entityName}}", user.entity_name)
        .replace("{{communicationName}}", entityRemovedComm.title);

      constant.info = {
        plan_id: entityRemovedComm.plan_id,
        communication_id: entityRemovedComm.Id,
      };

      await this.notificationService.SendNotification(constant, [user]);
    });

    return true;
  }

  private async updateCommCountOnActiveCampaign(companyId: number) {
    if (!appEnv("AC_ENABLED")) {
      return;
    }
    const [companyOwner, commCount] = await Promise.all([
      this.userRepository.FindOne({
        company_id: companyId,
        role: UserRoles.Owner,
      }),
      this.communicationRepository.Count({ company_id: companyId }),
    ]);

    await this.activeCampaignService.UpdateCustomFieldValue(
      companyOwner.email,
      [
        {
          field: appEnv("AC_FIELD_COMM_COUNT"),
          value: commCount
        }
      ]
    );
  }

  public async CreateCommunication(
    data: CreateCommunicationRequest,
    user: IRedisUserModel,
    subdomain: string
  ): Promise<CommunicationModel> {
    const [{ plan: planModel }, businessAreas, _, company] = await Promise.all([
      CheckUserPermissionForPlan(this, data.plan_id, user),
      this.businessAreaService.fetchBusinessAreas(
        data.business_areas,
        user.company_id
      ),
      CheckUserPermissionForBusinessAreas(this, data.business_areas, user),
      this.companyRepository.GetCompanyWithCounts(user.company_id),
    ]);

    if (
      company.communication_count >=
      company.subscription.features.communication_limit
    ) {
      throw new BadRequestException("Communication limit exceeded.");
    }

    let { owner, team } = await this.GetOwnerAndTeam(data, businessAreas, user);

    if (!owner || !owner.length) {
      const message =
        "User selected as Communication owner should have edit rights to selected Business Areas.".replace(
          "Business Area",
          DomainConstants[subdomain].BusinessArea
        );
      throw new BadRequestException(message);
    }

    if (
      new Date(data.start_date) < new Date(planModel.start_date) ||
      (!planModel.ongoing &&
        new Date(data.end_date) > new Date(planModel.end_date))
    ) {
      throw new BadRequestException(
        "Communication start date and end date should be within plan date range."
      );
    }

    if (
      !data.no_set_time &&
      data.start_date == data.end_date &&
      data.start_time >= data.end_time
    ) {
      throw new BadRequestException(
        "End time should be greater than start time for same day communications."
      );
    }

    let audiencePromise = this.audienceService.fetchAudience(
      data.audience,
      user.company_id
    );
    let channelPromise = this.channelService.fetchChannels(
      data.channels,
      user.company_id
    );
    let locationPromise = this.locationService.fetchLocations(
      data.locations,
      user.company_id
    );
    let tagPromise = this.tagService.fetchTags(data.tags, user.company_id);
    let strategicPrioritiesPromise =
      this.strategicPriorityService.fetchStrategicPriorities(
        data.strategic_priorities,
        user.company_id
      );
    let contentTypePromise = this.contentTypeService.fetchContentType(
      data.content_types,
      user.company_id
    );

    let [
      audience,
      channels,
      locations,
      tags,
      strategicPriorities,
      contentTypes,
    ] = await Promise.all([
      audiencePromise,
      channelPromise,
      locationPromise,
      tagPromise,
      strategicPrioritiesPromise,
      contentTypePromise,
    ]);

    let communicationModel = new CommunicationModel();
    communicationModel.company_id = user.company_id;
    communicationModel.plan_id = data.plan_id;
    communicationModel.title = data.title;
    communicationModel.owner = owner[0];
    communicationModel.team = team;
    communicationModel.tags = tags;
    communicationModel.strategic_priorities = strategicPriorities;
    communicationModel.content_types = contentTypes;
    communicationModel.description = data.description;
    communicationModel.objectives = data.objectives;
    communicationModel.key_messages = data.key_messages;
    communicationModel.start_date = data.start_date;
    communicationModel.end_date = data.end_date;
    communicationModel.full_day = data.full_day;
    communicationModel.no_set_time = data.no_set_time;
    communicationModel.is_confidential = data.is_confidential;
    communicationModel.show_on_calendar = data.show_on_calendar ?? true;

    if (!data.no_set_time) {
      communicationModel.start_time = data.start_time;
      communicationModel.end_time = data.end_time;
    }
    if (data.budget_planned || data.budget_actual) {
      const budgetModel = new BudgetModel();
      budgetModel.planned = data.budget_planned || 0;
      budgetModel.actual = data.budget_actual || 0;
      budgetModel.plan_id = data.plan_id;
      budgetModel.company_id = user.company_id;

      communicationModel.budget = budgetModel;
    }

    communicationModel.business_areas = businessAreas;
    communicationModel.audiences = audience;
    communicationModel.channels = channels;
    communicationModel.locations = locations;
    communicationModel.status = data.status || CommunicationStatus.InProgress;

    if (data.show_on_grid) {
      if (data.is_confidential) {
        throw new BadRequestException(
          "Communication cannot be added to the GRID export whilst marked confidential"
        );
      }
      const communicationGrid = new CommunicationGridModel();
      communicationGrid.show_on_grid = data.show_on_grid;
      communicationGrid.main_activity = data.main_activity;

      communicationModel.communication_grid = communicationGrid;
    }

    this.validateRRule(communicationModel, data.rrule, planModel, company);

    const communication = await this.communicationRepository.Create(
      communicationModel,
      user.Id
    );

    if (data.rrule) {
      try {
        await this.generateRecurringCommunications(
          communication,
          data.rrule,
          user
        );
      } catch (error) {
        if (error instanceof BadRequestException) {
          await this.communicationRepository.Delete({ Id: communication.Id });
        }
        throw error;
      }

      communication.rrule = data.rrule;
    }

    await this.GenerateCommunicationPermission([communication.Id], user);
    const [communicationPermission, files] = await Promise.all([
      this.communicationPermissionRepository.FindCommunicationPermission(
        communicationModel.Id,
        user.Id
      ),
      this.AddFiles(
        communication.Id,
        data.files ? { files: data.files } : { files: [] },
        user
      ),
    ]);

    communication.communication_permission = communicationPermission;
    communication.plan = planModel;

    this.SendCommunicationCreationNotification(communicationModel);
    this.SendRuleBasedNotification(communication, user);
    this.updateCommCountOnActiveCampaign(user.company_id);

    return communication;
  }

  public async UpdateCommunicationInSwimlane(
    communicationId: number,
    data: UpdateCommunicationInSwimlaneRequest,
    user: IRedisUserModel,
    subdomain: string
  ) {
    const relations = ["business_areas", "plan"];
    if (data.channels) relations.push("channels");
    if (data.strategic_priorities) relations.push("strategic_priorities");
    if (data.audiences) relations.push("audiences");

    let communicationModel = await this.communicationRepository.FindOne(
      {
        Id: communicationId,
        company_id: user.company_id,
      },
      {
        relations: relations,
      }
    );

    if (!communicationModel) {
      throw new BadRequestException("Communication not found.");
    }

    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    const planModel = communicationModel.plan;

    if (data.update_recurring && (data.start_date || data.end_date)) {
      throw new BadRequestException(
        "Updating start date or end date is not allowed in bulk update."
      );
    }

    if (
      data.start_date &&
      new Date(data.start_date) < new Date(planModel.start_date)
    ) {
      throw new BadRequestException(
        "Communication start date should be within plan date range."
      );
    }

    if (
      !planModel.ongoing &&
      data.end_date &&
      new Date(data.end_date) > new Date(planModel.end_date)
    ) {
      throw new BadRequestException(
        "Communication end date should be within plan date range."
      );
    }

    const businessAreasIds = communicationModel.business_areas.map(
      ({ Id }) => Id
    );

    let channels: ChannelModel[],
      stratigicPriorities: StrategicPriorityModel[],
      audiences: AudienceModel[];
    if (data.channels) {
      channels = await this.channelService.GetChannelByBusinessArea(
        businessAreasIds,
        data.channels,
        user.company_id
      );

      if (!channels || data.channels.length != channels.length) {
        const message =
          "The Channel does not have access to the communication's Business Area.".replace(
            "Business Area",
            DomainConstants[subdomain].BusinessArea
          );
        throw new BadRequestException(message);
      }

      const newChannel = channels.find(
        (newChannel) =>
          !communicationModel.channels.some(
            (channel) => channel.Id === newChannel.Id
          )
      );

      if (newChannel?.is_archive) {
        throw new BadRequestException(
          "You cannot add an archived channel to a communication"
        );
      }
    }

    if (data.strategic_priorities) {
      stratigicPriorities =
        await this.strategicPriorityService.fetchStrategicPriorities(
          data.strategic_priorities,
          user.company_id
        );
    }

    if (data.audiences) {
      audiences = await this.audienceService.GetAudienceByBusinessArea(
        businessAreasIds,
        data.audiences,
        user.company_id
      );

      if (!audiences || data.audiences.length != audiences.length) {
        const message =
          "The Audience does not have access to the communication's Business Area.".replace(
            "Business Area",
            DomainConstants[subdomain].BusinessArea
          );
        throw new BadRequestException(message);
      }
    }

    delete communicationModel["business_areas"];
    delete communicationModel["audience"];
    delete communicationModel["locations"];
    delete communicationModel["team"];
    delete communicationModel["tags"];
    delete communicationModel["social_posts"];
    delete communicationModel["files"];
    delete communicationModel["content_types"];

    communicationModel.channels = channels ? [] : communicationModel.channels;
    communicationModel.strategic_priorities = stratigicPriorities
      ? []
      : communicationModel.strategic_priorities;
    communicationModel.audiences = audiences
      ? []
      : communicationModel.audiences;
    communicationModel.start_date = data.start_date;
    communicationModel.end_date = data.end_date;

    await this.communicationRepository.Save(communicationModel);

    communicationModel.channels = channels ?? communicationModel.channels;
    communicationModel.strategic_priorities =
      stratigicPriorities ?? communicationModel.strategic_priorities;
    communicationModel.audiences = audiences ?? communicationModel.audiences;
    await this.communicationRepository.Save(communicationModel);

    if (communicationModel.rrule && data.update_recurring) {
      const recurringComms = await this.communicationRepository.Find({
        parent_id: communicationModel.Id,
      });

      await Promise.all(
        recurringComms.map((comm) => {
          return this.UpdateCommunicationInSwimlane(
            comm.Id,
            data,
            user,
            subdomain
          );
        })
      );
    }

    return communicationModel;
  }

  public async UpdateCommunicationInline(
    communicationId: number,
    data: UpdateCommunicationInlineRequest,
    user: IRedisUserModel,
    subdomain: string
  ): Promise<CommunicationModel> {
    const { communication: comm } = await this.GetCommunicationById(
      communicationId,
      user
    );
    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);


    const audiencePromise = this.audienceService.fetchAudience(
      data.audience,
      user.company_id
    );
    const channelPromise = this.channelService.fetchChannels(
      data.channels,
      user.company_id
    );

    const [newAudiences, newChannels] = await Promise.all([
      audiencePromise,
      channelPromise,
    ]);

    const oldCommState = DeepClone(comm);

    comm.title = data.title ?? comm.title;
    comm.start_date = data.start_date ?? comm.start_date;
    comm.end_date = data.end_date ?? comm.end_date;
    comm.no_set_time = data.no_set_time;
    comm.start_time = data.no_set_time
      ? null
      : data.start_time ?? comm.start_time;
    comm.end_time = data.no_set_time
      ? null
      : data.end_time ?? comm.end_time;
    comm.audiences = newAudiences ?? comm.audiences;
    comm.channels = newChannels ?? comm.channels;

    if (data.status !== undefined && data.status !== oldCommState.status) {
      comm.status = data.status;
      this.SendStatusChangedNotification(
        comm,
        [comm.owner, ...comm.team],
        subdomain
      );
    }

    await Promise.all([
      this.communicationRepository.Update(
        { Id: comm.Id },
        {
          title: comm.title,
          start_date: comm.start_date,
          end_date: comm.end_date,
          no_set_time: comm.no_set_time,
          start_time: comm.start_time,
          end_time: comm.end_time,
          status: comm.status,
        }
      ),
      this.communicationRepository.UpdateManyToManyRelation(
        oldCommState,
        "audiences",
        newAudiences,
      ),
      this.communicationRepository.UpdateManyToManyRelation(
        oldCommState,
        "channels",
        newChannels,
      )
    ]);

    this.SendRuleBasedNotification(comm, user, oldCommState);
    return comm;
  }

  public async UpdateCommunication(
    communicationId: number,
    data: UpdateCommunicationRequest,
    user: IRedisUserModel,
    subdomain: string
  ) {
    let { communication: communicationModel } = await this.GetCommunicationById(
      communicationId,
      user
    );

    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    const planModel = communicationModel.plan;
    const [businessAreas, planOwner] = await Promise.all([
      this.businessAreaService.fetchBusinessAreas(
        data.business_areas,
        user.company_id,
        null,
        communicationId
      ),
      this.planRepository.GetPlanOwners(data.plan_id),
    ]);
    let { owner, team } = await this.GetOwnerAndTeam(data, businessAreas, user);

    if (!owner || !owner.length) {
      const message =
        "User selected as Communication owner should have edit rights to selected Business Areas.".replace(
          "Business Area",
          DomainConstants[subdomain].BusinessArea
        );
      throw new BadRequestException(message);
    }

    if (owner.find((owner) => owner.is_deleted)) {
      throw new BadRequestException(
        "This communication contains deleted user(s) highlighted in gray, please update it with alternative user(s)."
      );
    }

    if (!communicationModel) {
      throw new BadRequestException("Communication Not Found");
    }

    const oldCommState = DeepClone(communicationModel);

    // Check if confidential is changed
    if (communicationModel.is_confidential != data.is_confidential) {
      let ownerMatched = owner.filter((ownerUser) => user.Id == ownerUser.Id);
      let planOwnerMatched = planOwner.filter((po) => user.Id == po.Id);

      if (
        !ownerMatched.length &&
        !planOwnerMatched.length &&
        user.role != UserRoles.Owner
      ) {
        throw new BadRequestException(
          "You can't change confidentiality of this communication."
        );
      }
    }

    let generateRecurrings: boolean = false;
    if (
      data.update_recurring &&
      (data.start_date || data.end_date) &&
      communicationModel.rrule // ==> having rrule means it's a parent recurring communication
    ) {
      if (!data.rrule) {
        throw new BadRequestException(
          "RRule is required for updating start date or end date in bulk update."
        );
      }
      generateRecurrings = true;
    }

    if (
      data.plan_id != communicationModel.plan_id &&
      data.update_recurring === false
    ) {
      throw new BadRequestException(
        "Plan cannot be changed for a single communication in recurring set."
      );
    }

    if (
      data.start_date &&
      new Date(data.start_date) < new Date(planModel.start_date)
    ) {
      throw new BadRequestException(
        "Communication start date should be within plan date range."
      );
    }

    if (
      !planModel.ongoing &&
      data.end_date &&
      new Date(data.end_date) > new Date(planModel.end_date)
    ) {
      throw new BadRequestException(
        "Communication start date should be within plan date range."
      );
    }

    // check end_time should be greater that start_time time for same day comm.
    const startDate = data.start_date || communicationModel.start_date;
    const endDate = data.end_date || communicationModel.end_date;
    if (
      !data.no_set_time &&
      startDate == endDate &&
      data.start_time >= data.end_time
    ) {
      throw new BadRequestException(
        "End time should be greater than start time for same day communications."
      );
    }

    let audiencePromise = this.audienceService.fetchAudience(
      data.audience,
      user.company_id
    );
    let channelPromise = this.channelService.fetchChannels(
      data.channels,
      user.company_id
    );
    let locationPromise = this.locationService.fetchLocations(
      data.locations,
      user.company_id
    );
    let tagPromise = this.tagService.fetchTags(data.tags, user.company_id);
    let strategicPrioritiesPromise =
      this.strategicPriorityService.fetchStrategicPriorities(
        data.strategic_priorities,
        user.company_id
      );
    let contentTypePromise = this.contentTypeService.fetchContentType(
      data.content_types,
      user.company_id
    );

    let [
      audience,
      channels,
      locations,
      tags,
      strategicPriorities,
      contentTypes,
    ] = await Promise.all([
      audiencePromise,
      channelPromise,
      locationPromise,
      tagPromise,
      strategicPrioritiesPromise,
      contentTypePromise,
    ]);

    const notificationCondition: boolean =
      !data.update_recurring || // if single update or
      (data.update_recurring && !communicationModel.parent_id); // if updating in bulk, then send for parent only

    communicationModel.title = data.title || communicationModel.title;
    if (
      data.status &&
      data.status != communicationModel.status
    ) {
      communicationModel.status = data.status;

      if (notificationCondition) {
        this.SendStatusChangedNotification(
          communicationModel,
          [
            ...owner,
            ...team,
          ],
          subdomain
        );
      }
    }

    // Send notification assigned and unassigned users
    if (notificationCondition && (data.owner_id || data.team.length)) {
      const [currentOwnerUsers, currentTeamUsers] = await Promise.all([
        this.userRepository.FindOwnerByCommunicationId(
          communicationId,
          communicationModel.company_id
        ),
        this.userRepository.FindTeamByCommunicationId(
          communicationId,
          communicationModel.company_id
        ),
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
      this.SendCommunicationAssigneeChangeNotification(
        communicationModel,
        newOwnerAssignees,
        oldOwnerAssignees,
        newTeamAssignees,
        oldTeamAssignees
      );
    }

    communicationModel.business_areas = [];
    communicationModel.audiences = data.audience ? [] : undefined;
    communicationModel.channels = data.channels ? [] : undefined;
    communicationModel.locations = data.locations ? [] : undefined;
    communicationModel.team = data.team ? [] : undefined;
    communicationModel.tags = data.tags ? [] : undefined;
    communicationModel.content_types = data.content_types ? [] : undefined;
    communicationModel.strategic_priorities = data.strategic_priorities
      ? []
      : undefined;
    communicationModel.plan_id = data.plan_id;
    communicationModel.description =
      data.description !== undefined
        ? data.description
        : communicationModel.description;
    communicationModel.objectives =
      data.objectives !== undefined
        ? data.objectives
        : communicationModel.objectives;
    communicationModel.key_messages =
      data.key_messages !== undefined
        ? data.key_messages
        : communicationModel.key_messages;
    communicationModel.start_date =
      data.start_date || communicationModel.start_date;
    communicationModel.end_date = data.end_date || communicationModel.end_date;
    communicationModel.full_day = data.full_day;
    communicationModel.no_set_time = data.no_set_time;
    communicationModel.start_time = data.no_set_time
      ? null
      : data.start_time || communicationModel.start_time;
    communicationModel.end_time = data.no_set_time
      ? null
      : data.end_time || communicationModel.end_time;
    communicationModel.owner = owner[0];
    communicationModel.is_confidential = data.is_confidential;
    communicationModel.show_on_calendar = data.hasOwnProperty(
      "show_on_calendar"
    )
      ? data.show_on_calendar
      : true;

    let socialPosts = communicationModel["social_posts"];
    delete communicationModel["social_posts"];

    let gridSavePromise;
    const communicationGrid =
      communicationModel.communication_grid || new CommunicationGridModel();
    if (data.show_on_grid === true) {
      if (communicationModel.is_confidential) {
        throw new BadRequestException(
          "Communication cannot be added to the GRID export whilst marked confidential"
        );
      }
      communicationGrid.main_activity = data.main_activity;
      communicationGrid.show_on_grid = data.show_on_grid;
      communicationGrid.communication_id = communicationModel.Id;

      gridSavePromise = this.communicationGridRepository.Upsert(
        communicationGrid,
        ["communication_id"]
      );
    } else if (
      data.show_on_grid === false &&
      communicationModel.communication_grid
    ) {
      gridSavePromise = this.communicationGridRepository.Update(
        { communication_id: communicationModel.Id },
        { show_on_grid: false }
      );
    }
    delete communicationModel["communication_grid"];

    await Promise.all([
      this.communicationRepository.Save(communicationModel),
      gridSavePromise,
    ]);

    communicationModel.business_areas = businessAreas;
    communicationModel.audiences = data.audience ? audience : undefined;
    communicationModel.channels = data.channels ? channels : undefined;
    communicationModel.locations = data.locations ? locations : undefined;
    communicationModel.team = data.team ? team : undefined;
    communicationModel.tags = data.tags ? tags : undefined;
    communicationModel.tags = data.tags ? tags : undefined;
    communicationModel.content_types = data.content_types
      ? contentTypes
      : undefined;
    communicationModel.strategic_priorities = data.strategic_priorities
      ? strategicPriorities
      : undefined;

    await this.communicationRepository.Save(communicationModel);
    communicationModel.plan = planModel;
    communicationModel.social_posts = socialPosts;

    await this.DeleteCommunicationPermission(communicationModel.Id);

    await this.GenerateCommunicationPermission([communicationModel.Id], user);

    let comm: CommunicationModel;
    // No need to add permissions and sign files if it's a child recurring communication (for optimization)
    if (!communicationModel.parent_id || !data.update_recurring) {
      let { communication } = await this.GetCommunicationById(
        communicationModel.Id,
        user
      );
      comm = communication;

      const [commPerm] = await Promise.all([
        this.communicationPermissionRepository.FindCommunicationPermission(
          comm.Id,
          user.Id
        ),
        Promise.all(comm.files.map((file) => this.UpdateFile(file))),
      ]);

      comm.communication_permission = commPerm;
    }

    if (
      communicationModel.rrule && // ==> having rrule means it's a parent recurring communication
      data.update_recurring && // ==> bulk update flag
      !generateRecurrings // ==> indicates that RRule updation is signalled, So no need to update
      //     child communications as it will be deleted and regenerated
    ) {
      const recurringComms = await this.communicationRepository.Find({
        parent_id: communicationModel.Id,
      });

      await Promise.all(
        recurringComms.map((comm) => {
          return this.UpdateCommunication(comm.Id, data, user, subdomain);
        })
      );
    }

    if (notificationCondition) {
      this.SendRuleBasedNotification(communicationModel, user, oldCommState);
    }

    if (generateRecurrings) {
      const companyPromise = this.companyRepository.GetCompanyWithCounts(
        user.company_id
      );
      const childComms = this.communicationRepository.Count({
        parent_id: communicationModel.Id,
      });

      const [company, childCount] = await Promise.all([
        companyPromise,
        childComms,
      ]);

      company.communication_count -= childCount;

      this.validateRRule(communicationModel, data.rrule, planModel, company);
      await this.generateRecurringCommunications(
        communicationModel,
        data.rrule,
        user
      );
    }

    this.updateCommCountOnActiveCampaign(user.company_id);

    return { communication: comm };
  }

  public async UpdateCommunicationBudget(
    communicationId,
    data: UpdateCommunicationBudgetRequest,
    user: IRedisUserModel
  ): Promise<CommunicationModel> {
    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    const communicationModel = await this.communicationRepository.FindOne({
      Id: communicationId,
      company_id: user.company_id,
    });

    if (!communicationModel) {
      throw new BadRequestException("Communication not found");
    }

    if (!communicationModel.budget) {
      const budgetModel = new BudgetModel();
      budgetModel.communication_id = communicationModel.Id;
      budgetModel.actual = data.budget_actual;
      budgetModel.planned = data.budget_planned;
      budgetModel.company_id = user.company_id;
      budgetModel.plan_id = communicationModel.plan_id;

      communicationModel.budget = await this.budgetRepository.Create(budgetModel);
    } else {
      await this.budgetRepository.Update(
        { Id: communicationModel.budget.Id },
        { 
          actual: data.budget_actual,
          planned: data.budget_planned,
        }
      );
    }

    if (communicationModel.rrule && data.update_recurring) {
      const recurringComms = await this.communicationRepository.Find({
        parent_id: communicationModel.Id,
      });

      await Promise.all(
        recurringComms.map((comm) => {
          return this.UpdateCommunicationBudget(comm.Id, data, user);
        })
      );
    }

    return communicationModel;
  }

  public async DeleteCommunication(
    communicationId: number,
    user: IRedisUserModel,
    deletionType: "this" | "following" | "all" = "this"
  ) {
    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    let communicationModel = await this.communicationRepository.FindOne({
      Id: communicationId,
      company_id: user.company_id,
    });

    if (!communicationModel) {
      throw new BadRequestException("Communication Not Found");
    }

    if (!communicationModel.parent_id) {
      deletionType = "this";
    }

    if (deletionType === "this") {
      // Delete only this communication
      await this.communicationRepository.DeleteById(communicationModel.Id, false);
    } else if (deletionType === "following") {
      // Delete this and all following occurrences in series
      await this.communicationRepository.Delete(
        {
          parent_id: communicationModel.parent_id,
          company_id: user.company_id,
          start_date: MoreThanOrEqual(communicationModel.start_date),
        },
        false
      );
    } else if (deletionType === 'all') {
      // Delete all recurring by deleting the parent
      await this.communicationRepository.DeleteById(communicationModel.parent_id, false);
    }
    return null;
  }

  public async GetCommunication(
    communicationId: number
  ): Promise<CommunicationModel> {
    return await this.communicationRepository.FindById(communicationId);
  }

  public async GetCommunications(data: PaginationParam): Promise<{
    communications: Array<CommunicationModel>;
    count: number;
    page: number;
    limit: number;
  }> {
    const [communications, count] =
      await this.communicationRepository.FindAndCount(
        {},
        GetPaginationOptions(data)
      );
    return {
      communications: communications,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchCommunications(
    data: CommunicationSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    communications: Array<CommunicationModel>;
    page: number;
    limit: number;
    count: number;
  }> {
    const { communication, count } =
      await this.communicationRepository.SearchCommunication(data, user);
    return {
      communications: communication,
      page: data.page,
      limit: data.limit,
      count,
    };
  }

  public async GetCommunicationById(
    communicationId: number,
    user: IRedisUserModel
  ): Promise<{
    communication: CommunicationModel;
    folderAncestors: ParentFolderModel[];
  }> {
    const [
      communication,
      tags,
      strategicPriorities,
      audiences,
      channels,
      locations,
      contentTypes,
      files,
      team,
      businessAreas,
    ] = await Promise.all([
      this.communicationRepository.GetCommunicationById(user, communicationId),
      this.tagService.GetTagsByCommunicationId(communicationId, ["tag.name"]),
      this.strategicPriorityService.GetStrategicPriorityByCommunicationId(
        communicationId,
        ["strategic_priority.name"]
      ),
      this.audienceService.GetAudienceByCommunicationId(communicationId, [
        "audience.name",
      ]),
      this.channelService.GetChannelByCommunicationId(communicationId, [
        "channel.name",
      ]),
      this.locationService.GetLocationByCommunicationId(communicationId, [
        "location.name",
      ]),
      this.contentTypeService.GetContentTypeByCommunicationId(communicationId, [
        "content_type.name",
      ]),
      this.communicationFilesRepository.GetFilesByCommunicationId(
        communicationId
      ),
      this.userRepository.GetTeamByCommunicationId(communicationId, [
        "user.full_name",
        "user.email",
        "user.image_url",
        "user.is_deleted",
      ]),
      this.businessAreaService.GetBusinessAreaByCommunicationId(
        communicationId,
        ["business_area.name"]
      ),
    ]);

    if (!communication) {
      throw new BadRequestException("Communication Not Found");
    }

    communication.tags = tags;
    communication.strategic_priorities = strategicPriorities;
    communication.audiences = audiences;
    communication.channels = channels;
    communication.locations = locations;
    communication.content_types = contentTypes;
    communication.files = files;
    communication.team = team;
    communication.business_areas = businessAreas;

    if (!communication) {
      throw new BadRequestException("Communication Not Found");
    }

    if (communication.is_confidential) {
      // Check if user has access to confidential comm
      let teamMatched = communication.team.filter(
        (teamUser) => user.Id == teamUser.Id
      );

      if (
        communication.owner_id != user.Id &&
        !teamMatched.length &&
        user.role != UserRoles.Owner
      ) {
        throw new BadRequestException(
          "You don't have access to this communication."
        );
      }
    }

    await Promise.all(
      communication.files.map(async (communcation_file) => {
        await this.UpdateFile(communcation_file.file);
      })
    );

    const folderAncestors =
      await this.parentFolderRepository.GetFolderAncestors(
        communication.plan.parent_folder_id,
        user.company_id
      );

    return { communication, folderAncestors };
  }

  public async DeleteCommunications(
    data: DeleteCommunicationRequest,
    user: IRedisUserModel
  ) {
    const communications = await this.communicationRepository.Find({
      Id: In(data.ids),
      company_id: user.company_id,
      plan_id: data.plan_id,
    });

    if (communications.length != data.ids.length) {
      throw new BadRequestException("Communication Not Found");
    }

    await CheckUserPermissionForMultipleCommunications(this, data.ids, user);

    await this.communicationRepository.Delete(
      { Id: In(data.ids), company_id: user.company_id },
      false
    );
    return null;
  }

  public async GetCalendarHeatMap(data, user: IRedisUserModel) {
    const heatMap = await this.communicationRepository.GetCalendarHeatMap(data, user);
    return { heatMap };
  }

  public async GetCommunicationHeatMapByMonth(data, user: IRedisUserModel) {
    const heatMap =
      await this.communicationRepository.GetCommunicationHeatMapByMonth(
        data,
        user
      );
    return heatMap;
  }

  public async GetAnalyticsHeatMapV2(data: any, user: IRedisUserModel) {
    const heatMap = await this.communicationRepository.GetAnalyticsHeatMapV2(
      data,
      user
    );
    return heatMap;
  }

  public async GetCommunicationsByDateRange(
    data,
    user: IRedisUserModel,
    select?: Array<CommunicationSelectable>
  ) {
    // if range is less than or equal to 7 days, then load owner image
    const loadOwnerImage: boolean =
      moment(data.end_date).diff(moment(data.start_date), "days") <= 7;

    const communications =
      await this.communicationRepository.GetCommunicationsByDateRange(
        data,
        user,
        select,
        loadOwnerImage
      );
    return communications;
  }

  public async GetFrequency(data, user: IRedisUserModel) {
    const communicationFrequency =
      await this.communicationRepository.GetFrequency(data, user);
    return communicationFrequency;
  }

  public async GetCommunicationCountByDateRange(data, user: IRedisUserModel) {
    const communicationCount =
      await this.communicationRepository.GetCommunicationCountByDateRange(
        data,
        user
      );

    return communicationCount;
  }

  public async AverageCommunicationCount(data, user: IRedisUserModel) {
    const averageCommunicationCount =
      await this.communicationRepository.AverageCommunicationCount(data, user);
    return averageCommunicationCount;
  }

  public async GetCommunicationsAndBudgets(data, user: IRedisUserModel) {
    const communicationAndBudgets =
      await this.communicationRepository.GetCommunicationsAndBudgets(
        data,
        user
      );
    return communicationAndBudgets;
  }

  public async GetCommunicationsLiveToday(data, user: IRedisUserModel) {
    const liveCommunications =
      await this.communicationRepository.GetCommunicationsLiveToday(data, user);
    return liveCommunications;
  }

  public async UploadFiles(
    communicationId: number,
    files,
    user: IRedisUserModel
  ) {
    let communicationModel = await this.communicationRepository.FindOne({
      Id: communicationId,
      company_id: user.company_id,
    });

    if (!communicationModel) {
      throw new BadRequestException("Communication Not Found");
    } else if (
      ![UserRoles.Owner, UserRoles.Admin].includes(user.role) &&
      communicationModel.owner_id !== user.Id
    ) {
      throw new BadRequestException("This user is not allowed to perform this action.");
    }

    const communicationFilesModels = await this.createCommunicationFiles(
      files,
      user,
      communicationModel
    );

    return { files: communicationFilesModels };
  }

  public async AddFiles(
    communicationId: number,
    data: AddFileRequest,
    user: IRedisUserModel
  ) {
    if (!data.files || !data.files.length) {
      return { files: [] };
    }
    let communicationModel = await this.communicationRepository.FindOne({
      Id: communicationId,
      company_id: user.company_id,
    });

    if (!communicationModel) {
      throw new BadRequestException("Communication Not Found");
    }

    await CheckUserPermissionForCommunication(this, communicationId, user);

    const communicationFilesModels = await this.createCommunicationFiles(
      data.files,
      user,
      communicationModel
    );

    return { files: communicationFilesModels };
  }

  public async DeleteCommunicationFile(
    communicationFileId: number,
    user: IRedisUserModel
  ) {
    let communicationFile = await this.communicationFilesRepository.FindById(
      communicationFileId
    );
    if (!communicationFile) {
      throw new BadRequestException("File not Found.");
    }

    await CheckUserPermissionForCommunication(
      this,
      communicationFile.communication_id,
      user
    );

    await this.communicationFilesRepository.Delete(
      { Id: communicationFileId },
      false
    );
    await this.fileService.DeleteFile(communicationFile.file);
    return null;
  }

  public async UpdateCommunicationFile(
    communicationFileId: number,
    data: FileTypeRequest,
    user: IRedisUserModel
  ) {
    let communicationFile = await this.communicationFilesRepository.FindById(
      communicationFileId
    );
    if (!communicationFile) {
      throw new BadRequestException("File not Found.");
    }

    await CheckUserPermissionForCommunication(
      this,
      communicationFile.communication_id,
      user
    );

    communicationFile.file.name = data.name;
    communicationFile.file.path = data.path;

    await this.fileService.Update(communicationFile.file_id, data);
    return communicationFile;
  }

  public async DuplicateCommunicationById(
    communicationId: number,
    data,
    user: IRedisUserModel
  ) {
    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    const { communication } = await this.GetCommunicationById(
      communicationId,
      user
    );

    if (!communication) {
      throw new BadRequestException("Communication Not Found.");
    }

    let communicationModel = new CommunicationModel();
    communicationModel.company_id = user.company_id;
    communicationModel.plan = communication.plan;
    communicationModel.title = data.title;
    communicationModel.owner = communication.owner;
    communicationModel.team = communication.team;
    communicationModel.tags = communication.tags;
    communicationModel.content_types = communication.content_types;
    communicationModel.strategic_priorities =
      communication.strategic_priorities;
    communicationModel.description = communication.description;
    communicationModel.objectives = communication.objectives;
    communicationModel.key_messages = communication.key_messages;
    communicationModel.start_date = data.start_date;
    communicationModel.end_date = data.end_date;
    communicationModel.full_day = communication.full_day;
    communicationModel.no_set_time = communication.no_set_time;
    communicationModel.is_confidential = communication.is_confidential;
    communicationModel.show_on_calendar = communication.show_on_calendar;

    if (!communication.no_set_time) {
      communicationModel.start_time = communication.start_time;
      communicationModel.end_time = communication.end_time;
    }

    communicationModel.business_areas = communication.business_areas;
    communicationModel.audiences = communication.audiences;
    communicationModel.channels = communication.channels;
    communicationModel.locations = communication.locations;
    communicationModel.status =
      communication.status || CommunicationStatus.InProgress;

    if (communication.budget) {
      const budget = new BudgetModel();
      budget.planned = communication.budget.planned;
      budget.actual = communication.budget.actual;
      budget.plan_id = communication.budget.plan_id;
      budget.communication_id = communication.budget.communication_id;
      budget.company_id = communication.budget.company_id;

      communicationModel.budget = budget;
    }

    if (data.duplicate_task) {
      let commTasks = await this.taskRepository.GetTasksByCompanyId(
        user.company_id,
        communication.Id
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
        taskModel.plan_id = communication.plan_id;

        let commStartDate = moment(communication.start_date);
        let taskDueDate = moment(task.due_date);
        let newtaskDueDate = moment(communicationModel.start_date);
        newtaskDueDate.add(
          Math.floor(moment.duration(taskDueDate.diff(commStartDate)).asDays()),
          "days"
        );

        taskModel.due_date = new Date(newtaskDueDate.format("YYYY-MM-DD"));

        communicationModel.tasks.push(taskModel);
      });
    }

    const newCommunication = await this.communicationRepository.Create(
      communicationModel,
      user.Id
    );

    if (data.duplicate_files && communication.files.length) {
      newCommunication.files = await this.createCommunicationFiles(
        communication.files.map(({ file }) => file),
        user,
        newCommunication
      );
    }

    this.SendCommunicationDuplicateNotification(
      newCommunication,
      communication.title,
      [communication.owner, ...communication.team]
    );

    await this.GenerateCommunicationPermission([newCommunication.Id], user);
    newCommunication.communication_permission =
      await this.communicationPermissionRepository.FindCommunicationPermission(
        newCommunication.Id,
        user.Id
      );

    return newCommunication;
  }

  public async GetCommunicationTeamById(
    communicationId: Number,
    user: IRedisUserModel
  ) {
    const users = await this.communicationRepository.GetCommunicationTeamById(
      communicationId,
      user.company_id
    );
    return users;
  }

  public async UpdateTaskPosition(
    communicationId: number,
    data: UpdateTaskPositionRequest,
    user: IRedisUserModel
  ) {
    let communication = await this.communicationRepository.GetCommunicationById(
      user,
      communicationId
    );

    if (!communication) {
      throw new BadRequestException("Communication Not Found.");
    }

    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    await this.communicationRepository.Update(
      { Id: communicationId },
      { task_position: data }
    );
    communication.task_position = data;

    return communication;
  }

  public async UpdateCommunicationStatus(
    communicationId: number,
    data: UpdateCommunicationStatusRequest,
    user: IRedisUserModel,
  ) {
    let communicationModel = await this.communicationRepository.FindOne(
      {
        Id: communicationId,
        company_id: user.company_id,
      },
      { relations: ["owner", "team"] }
    );

    if (!communicationModel) {
      throw new BadRequestException("Communication Not Found");
    }

    await CheckUserPermissionForCommunicationEdit(this, communicationId, user);

    const notificationCondition: boolean =
      !data.update_recurring || // if single update or
      (data.update_recurring && !communicationModel.parent_id); // if updating in bulk, then send for parent only

    if (notificationCondition && data.status != communicationModel.status) {
      communicationModel.status = data.status;

      const [users] = await Promise.all([
        this.userRepository.FindTeamAndOwnerByCommunicationId(
          communicationId,
          communicationModel.company_id
        ),
        this.communicationRepository.Update(
          { Id: communicationId },
          { status: data.status }
        ),
      ]);

      this.SendStatusChangedNotification(communicationModel, users, data._subdomain);
    }

    if (communicationModel.rrule && data.update_recurring) {
      const recurringComms = await this.communicationRepository.Find({
        parent_id: communicationModel.Id,
      });

      await Promise.all(
        recurringComms.map((comm) => {
          return this.UpdateCommunicationStatus(comm.Id, data, user);
        })
      );
    }

    return communicationModel;
  }

  public async UpdateCommunicationRRule(
    commId: number,
    data: UpdateCommunicationRRule,
    user: IRedisUserModel
  ) {
    const communicationPromise = this.GetCommunicationById(commId, user);
    const childCommsPromise = this.communicationRepository.Count({
      parent_id: commId,
    });
    const companyPromise = this.companyRepository.GetCompanyWithCounts(
      user.company_id
    );

    const [{ communication }, company, childComms] = await Promise.all([
      communicationPromise,
      companyPromise,
      childCommsPromise,
    ]);

    if (!communication) {
      throw new BadRequestException("Communication Not Found");
    }

    if (communication.parent_id) {
      throw new BadRequestException(
        "This communication is part of recurring communication."
      );
    }

    await CheckUserPermissionForCommunicationEdit(this, commId, user);

    company.communication_count -= childComms;
    this.validateRRule(communication, data.rrule, communication.plan, company);
    const updatedComm = await this.generateRecurringCommunications(
      communication,
      data.rrule,
      user
    );

    this.updateCommCountOnActiveCampaign(user.company_id);

    return updatedComm;
  }

  public async GenerateWeeklyReport(
    params: GenerateWeeklyReportRequest,
    user: IRedisUserModel,
    req: Request
  ) {
    if (params["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        params.location,
        user.company_id
      );
      params.location = locations.map(({ Id }) => Id);
    }
    if (params["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          params.business_area,
          user.company_id
        );
      params.business_area = businessAreas.map(({ Id }) => Id);
    }
    params["end_date"] = moment(params.start_date).add(7, "days").format("YYYY-MM-DD");
    params["is_weekly_report"] = true;
    const [comms, company] = await Promise.all([
      this.communicationRepository.GetCommunicationsByDateRange(
        params,
        user,
        ["owner", "channels"],
      ),
      this.companyRepository.FindById(user.company_id),
    ]);

    // group communications by date
    const reportMap = {};
    comms.forEach((comm) => {
      const date = moment(comm.start_date).format("YYYY-MM-DD");
      if (!reportMap[date]) reportMap[date] = [];

      reportMap[date].push({
        url: `https://${req.get("host")}/#/plans/communication/${comm.Id}`,
        title: comm.title,
        description: htmlToText(comm.description, {
          selectors: [
            {
              selector: "a",
              options: {
                hideLinkHrefIfSameAsText: true,
              }
            }
          ]
        }).trim(),
        channel: comm.channels && comm.channels.length
          ? comm.channels.map((ch) => ch.name).join(", ")
          : "",
        owner: { full_name: comm.owner.full_name, email: `mailto:${comm.owner.email}` },
      });
    });

    const week = Object.entries(reportMap).map(([date, communications]) => ({
      date: moment(date).format('dddd D MMMM'),
      communications,
    }));

    const data = {
      start_date: ChangeDateFormat(params.start_date, company.date_format, "/"),
      week,
    }

    const buf = await createReport({
      template: ReadDocxTemplate("weekly-report.docx", "default"),
      cmdDelimiter: ["+++", "+++"],
      data,
    });

    const responseData = await UploadFileToS3(
      buf,
      `${Date.now()}_weekly_report.docx`,
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

  public async PreviewWeeklyReport(
    params: GenerateWeeklyReportRequest,
    user: IRedisUserModel,
  ) {
    if (params["location"]) {
      let locations = await this.locationService.GetAllLocationsLevels(
        params.location,
        user.company_id
      );
      params.location = locations.map(({ Id }) => Id);
    }
    if (params["business_area"]) {
      let businessAreas =
        await this.businessAreaService.GetAllBusinessAreaLevels(
          params.business_area,
          user.company_id
        );
      params.business_area = businessAreas.map(({ Id }) => Id);
    }
    params["end_date"] = moment(params.start_date).add(7, "days").format("YYYY-MM-DD");
    params["is_weekly_report"] = true;
    const comms = await this.communicationRepository.GetCommunicationsByDateRange(
      params,
      user,
      ["owner", "channels"],
      true,
    );

    return comms;
  }
}
