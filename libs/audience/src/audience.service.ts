import { BadRequestException } from "routing-controllers";
import { AudienceRepository } from "../../repository/audience/AudienceRepository";
import { BusinessAreaRepository } from "../../repository/business_area/BusinessAreaRepository";

import { AudienceModel } from "../../model/audience/AudienceModel";
import {
  CreateAudienceRequest,
  UpdateAudienceRequest,
  AudienceSearchRequest,
  UpdateAudiencesRequest,
  GetAudienceRequest,
} from "../../../api/controller/audience/AudienceRequest";
import { In } from "typeorm";
import { IRedisUserModel } from "../../model/user/UserModel";
import { NotificationRuleRepository } from "../../repository/notification/NotificationRuleRepository";
import { NotificationRuleEntity } from "../../model/notification/NotificationRuleModel";
import { CompanySettingsService } from "../company/CompanySettingsService";

@Injectable()
export class AudienceService {
  constructor(
    private audienceRepository: AudienceRepository,
    private businessAreaRepository: BusinessAreaRepository,
    private notificationRuleRepository: NotificationRuleRepository,
    private companySettingsService: CompanySettingsService,
  ) {}

  public async fetchAudience(
    audienceIds: Array<number>,
    companyId: number,
    select?: Array<string>
  ) {
    let audiencePromise: Promise<AudienceModel[]> = new Promise((resolve) => {
      resolve([]);
    });

    if (audienceIds && audienceIds.length > 0) {
      audiencePromise = this.audienceRepository.Find(
        {
          Id: In(audienceIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return audiencePromise;
  }

  public async CreateAudience(
    data: CreateAudienceRequest,
    user: IRedisUserModel
  ): Promise<AudienceModel> {
    let audienceExists = await this.audienceRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (audienceExists) {
      throw new BadRequestException("This Audience name already exists.");
    }

    let audienceModel = new AudienceModel();
    audienceModel.company_id = user.company_id;
    audienceModel.name = data.name;
    audienceModel.business_areas = await this.businessAreaRepository.FindByIds(
      data.business_areas
    );

    const audience = await this.audienceRepository.Create(audienceModel);

    this.companySettingsService.CheckCompanySettingsCompleted(user.company_id);
    return audience;
  }

  public async UpdateAudience(
    audienceId,
    data: UpdateAudienceRequest,
    user: IRedisUserModel
  ) {
    let audience = await this.audienceRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (audience.length) {
      if (audience.find((aud) => aud.Id != audienceId)) {
        throw new BadRequestException("This Audience already exists.");
      }
    }

    let audienceModel: AudienceModel = await this.audienceRepository.FindOne({
      Id: audienceId,
    });

    if (!audienceModel) {
      throw new BadRequestException("Not Found");
    }

    const businessAreaPromise = this.businessAreaRepository.FindByIds(
      data.business_areas
    );
    audienceModel.name = data.name || audienceModel.name;
    audienceModel.business_areas = [];
    await this.audienceRepository.Save(audienceModel);

    audienceModel.business_areas = await businessAreaPromise;
    await this.audienceRepository.Save(audienceModel);

    return { audience: audienceModel };
  }

  public async DeleteAudience(audienceIds: number[], user: IRedisUserModel) {
    await Promise.all([
      this.audienceRepository.Delete(
        {
          Id: In(audienceIds),
          company_id: user.company_id,
        },
        false
      ),
      this.notificationRuleRepository.Delete({
        entity: NotificationRuleEntity.Audience,
        entity_id: In(audienceIds),
      }, false),
    ]);
    return null;
  }

  public async UpdateAudiences(data: UpdateAudiencesRequest) {
    let audiences = [];
    for (let index = 0, len = data.audiences.length; index < len; index++) {
      let audienceModel: AudienceModel = await this.audienceRepository.FindOne({
        Id: data.audiences[index].Id,
      });
      if (!audienceModel) {
        continue;
      }
      audienceModel.name = data.audiences[index].name
        ? data.audiences[index].name
        : audienceModel.name;
      await this.audienceRepository.Save(audienceModel);
      audiences.push(audienceModel);
    }

    return { audiences: audiences };
  }

  public async GetAudience(audienceId: number): Promise<AudienceModel> {
    return await this.audienceRepository.FindById(audienceId);
  }

  public async GetAudiences(
    data: GetAudienceRequest,
    user: IRedisUserModel
  ): Promise<{
    audiences: number | any[];
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const [audiences, count] = await this.audienceRepository.GetAudiences(
      data,
      user.company_id
    );
    return {
      audiences: audiences,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchAudiences(
    data: AudienceSearchRequest,
    user: IRedisUserModel
  ): Promise<{ audiences: Array<AudienceModel>; page: number; limit: number }> {
    if (data.business_areas) {
      const businessAreas = await this.businessAreaRepository.GetAncestors(
        data
      );
      data.business_areas = businessAreas.map(({ Id }) => Id);
    }
    const audiences = await this.audienceRepository.SearchAudience(
      data,
      user.company_id
    );
    return { audiences: audiences, page: data.page, limit: data.limit };
  }

  public async GetAudienceCount(data, user: IRedisUserModel) {
    const audienceCount = await this.audienceRepository.GetAudienceCount(
      data,
      user
    );
    return audienceCount;
  }

  public async GetMostActiveAudience(data, user: IRedisUserModel) {
    const audience = await this.audienceRepository.GetMostActiveAudience(
      data,
      user
    );
    return audience;
  }

  public async GetMostActiveAudienceV2(data, user: IRedisUserModel) {
    const audience = await this.audienceRepository.GetMostActiveAudienceV2(
      data,
      user
    );
    return audience;
  }

  public async GetAudienceByBusinessArea(
    businessAreasIds: Array<number>,
    audienceIds: Array<number>,
    companyId: number
  ): Promise<AudienceModel[]> {
    let businessAreas = await this.businessAreaRepository.GetAncestors(
      { business_areas: businessAreasIds }
    );
    businessAreasIds = businessAreas.map(({ Id }) => Id);

    businessAreas = await this.businessAreaRepository.GetAllBusinessAreaLevels(
      businessAreasIds,
      companyId
    );
    businessAreasIds = businessAreas.map(({ Id }) => Id);

    const audiences = await this.audienceRepository.GetAudienceByBusinessArea(
      businessAreasIds,
      audienceIds,
      companyId
    );

    return audiences;
  }

  public async GetAudienceByCommunicationId(communicationId: number, select?: Array<string>) {
    return await this.audienceRepository.GetAudienceByCommunicationId(
      communicationId,
      select,
    );
  }
}
