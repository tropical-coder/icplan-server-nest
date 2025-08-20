import { BadRequestException } from "routing-controllers";
import { StrategicPriorityRepository } from "../../repository/strategic_priority/StrategicPriorityRepository";

import { StrategicPriorityModel } from "../../model/strategic_priority/StrategicPriorityModel";
import { RedisRepository } from "../../repository/RedisRepository";
import {
  CreateStrategicPriorityRequest,
  UpdateStrategicPriorityRequest,
  StrategicPrioritySearchRequest,
  UpdateStrategicPrioritiesRequest,
  GetStrategicPriorities,
} from "../../../api/controller/strategic_priority/StrategicPriorityRequest";
import { In } from "typeorm";
import { IRedisUserModel } from "../../model/user/UserModel";
import { NotificationRuleRepository } from "../../repository/notification/NotificationRuleRepository";
import { NotificationRuleEntity } from "../../model/notification/NotificationRuleModel";
import { CompanySettingsService } from "../company/CompanySettingsService";

@Injectable()
export class StrategicPriorityService {
  constructor(
    private strategicPriorityRepository: StrategicPriorityRepository,
    private notificationRuleRepository: NotificationRuleRepository,
    private companySettingsService: CompanySettingsService,
  ) {}

  public async fetchStrategicPriorities(
    spIds: Array<number>,
    companyId: number,
    select?: Array<string>
  ) {
    let spPromise: Promise<StrategicPriorityModel[]> = new Promise(
      (resolve) => {
        resolve([]);
      }
    );

    if (spIds && spIds.length > 0) {
      spPromise = this.strategicPriorityRepository.Find(
        {
          Id: In(spIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return spPromise;
  }

  public async CreateStrategicPriority(
    data: CreateStrategicPriorityRequest,
    user: IRedisUserModel
  ): Promise<StrategicPriorityModel> {
    let strategicPriorityExists =
      await this.strategicPriorityRepository.FindOne({
        name: data.name,
        company_id: user.company_id,
      });

    if (strategicPriorityExists) {
      throw new BadRequestException("This Strategic Priority name already exists.");
    }

    let strategicPriorityModel = new StrategicPriorityModel();
    strategicPriorityModel.company_id = user.company_id;
    strategicPriorityModel.name = data.name;

    const strategic_priority = await this.strategicPriorityRepository.Create(
      strategicPriorityModel
    );

    this.companySettingsService.CheckCompanySettingsCompleted(user.company_id);

    return strategic_priority;
  }

  public async UpdateStrategicPriority(
    strategicPriorityId: number,
    data: UpdateStrategicPriorityRequest,
    user: IRedisUserModel
  ) {
    let strategicePriority = await this.strategicPriorityRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (strategicePriority.length) {
      if (strategicePriority.find((aud) => aud.Id != strategicPriorityId)) {
        throw new BadRequestException(
          "This Strategic Priority name already exists."
        );
      }
    }

    let strategicPriorityModel: StrategicPriorityModel =
      await this.strategicPriorityRepository.FindOne({
        Id: strategicPriorityId,
      });

    if (!strategicPriorityModel) {
      throw new BadRequestException("Not Found");
    }

    strategicPriorityModel.name = data.name || strategicPriorityModel.name;
    await this.strategicPriorityRepository.Save(strategicPriorityModel);

    return { strategic_priority: strategicPriorityModel };
  }

  public async UpdateStrategicPriorities(
    data: UpdateStrategicPrioritiesRequest
  ) {
    let strategicPriorities = [];
    for (
      let index = 0, len = data.strategic_priorities.length;
      index < len;
      index++
    ) {
      let strategicPriorityModel: StrategicPriorityModel =
        await this.strategicPriorityRepository.FindOne({
          Id: data.strategic_priorities[index].Id,
        });
      if (!strategicPriorityModel) {
        continue;
      }
      strategicPriorityModel.name = data.strategic_priorities[index].name
        ? data.strategic_priorities[index].name
        : strategicPriorityModel.name;
      await this.strategicPriorityRepository.Save(strategicPriorityModel);
      strategicPriorities.push(strategicPriorityModel);
    }

    return { strategic_priorities: strategicPriorities };
  }

  public async DeleteStrategicPriority(
    strategicPriorityIds: number[],
    user: IRedisUserModel
  ) {
    await Promise.all([
      this.strategicPriorityRepository.Delete(
        {
          Id: In(strategicPriorityIds),
          company_id: user.company_id,
        },
        false
      ),
      this.notificationRuleRepository.Delete({
        entity: NotificationRuleEntity.StrategicPriority,
        entity_id: In(strategicPriorityIds),
      }, false),
    ]);
    return null;
  }

  public async GetStrategicPriority(
    strategicPriorityId: number
  ): Promise<StrategicPriorityModel> {
    return await this.strategicPriorityRepository.FindById(strategicPriorityId);
  }

  public async GetStrategicPrioritys(
    data: GetStrategicPriorities,
    user: IRedisUserModel
  ): Promise<{
    strategic_priorities: number | any[];
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const [strategic_priorities, count] =
      await this.strategicPriorityRepository.GetStrategicPriority(
        data,
        user.company_id
      );
    return {
      strategic_priorities: strategic_priorities,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchStrategicPrioritys(
    data: StrategicPrioritySearchRequest,
    user: IRedisUserModel
  ): Promise<{
    strategic_priorities: Array<StrategicPriorityModel>;
    page: number;
    limit: number;
  }> {
    const strategicPriorities =
      await this.strategicPriorityRepository.SearchStrategicPriority(
        data,
        user.company_id
      );
    return {
      strategic_priorities: strategicPriorities,
      page: data.page,
      limit: data.limit,
    };
  }

  public async GetMostActiveStrategicPriority(data, user: IRedisUserModel) {
    const strategicPriorities =
      await this.strategicPriorityRepository.GetMostActiveStrategicPriority(
        data,
        user
      );
    return strategicPriorities;
  }

  public async GetMostActiveStrategicPriorityV2(data, user: IRedisUserModel) {
    const strategicPriorities =
      await this.strategicPriorityRepository.GetMostActiveStrategicPriorityV2(
        data,
        user
      );
    return strategicPriorities;
  }

  public async GetStrategicPriorityByCommunicationId(communicationId: number, select?: Array<string>) {
    return await this.strategicPriorityRepository.GetStrategicPriorityByCommunicationId(
      communicationId,
      select,
    );
  }
}
