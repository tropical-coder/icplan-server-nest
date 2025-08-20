import { UserBusinessAreaPermissionRepository } from "../../repository/user/business_area_permission/UserBusinessAreaPermissionRepository";
import { BadRequestException } from "routing-controllers";
import { BusinessAreaRepository } from "../../repository/business_area/BusinessAreaRepository";

import { BusinessAreaModel } from "../../model/business_area/BusinessAreaModel";
import {
  CreateBusinessAreaRequest,
  UpdateBusinessAreaRequest,
  BusinessAreaSearchRequest,
  UpdateBusinessAreasRequest,
  CreateSubBusinessAreaRequest,
  GetBusinessAreasRequest,
} from "../../../api/controller/business_area/BusinessAreaRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { In } from "typeorm";
import { UserBusinessAreasSearchRequest } from "../../../api/controller/user/UserRequest";
import { IRedisUserModel } from "../../model/user/UserModel";
import { DomainConstants } from "../../constant/DomainConstants";
import { UserPermission } from "../../model/user/business_area_permission/UserBusinessAreaPermissionModel";
import { CompanySettingsService } from "../company/CompanySettingsService";

@Injectable()
export class BusinessAreaService {
  constructor(
    private businessAreaRepository: BusinessAreaRepository,
    private userBusinessAreaPermissionRepository: UserBusinessAreaPermissionRepository,
    private companySettingsService: CompanySettingsService,
  ) {}

  public async fetchBusinessAreas(
    businessAreaIds: Array<number>,
    companyId: number,
    select?: string[],
    communicationId?: number
  ) {
    let businessAreasPromise: Promise<BusinessAreaModel[]> = new Promise(
      (resolve) => {
        resolve([]);
      }
    );

    if (!businessAreaIds) {
      businessAreasPromise = this.GetBusinessAreaByCommunicationId(communicationId, [
        "business_area.name",
      ]);
    } else if (businessAreaIds.length > 0) {
      businessAreasPromise = this.businessAreaRepository.Find(
        {
          Id: In(businessAreaIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return businessAreasPromise;
  }

  public async CreateBusinessArea(
    data: CreateBusinessAreaRequest,
    user: IRedisUserModel,
    subdomain: string
  ): Promise<BusinessAreaModel> {
    let businessArea = await this.businessAreaRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (businessArea) {
      const message = "This Business Area name already exists.".replace(
        "Business Area",
        DomainConstants[subdomain].BusinessArea
      );
      throw new BadRequestException(message);
    }

    let parentBusinessAreaModel = new BusinessAreaModel();
    parentBusinessAreaModel.name = data.name;
    parentBusinessAreaModel.company_id = user.company_id;
    const parentBusinessArea = await this.businessAreaRepository.Create(
      parentBusinessAreaModel
    );

    await this.userBusinessAreaPermissionRepository.Create({
      user_id: user.Id,
      business_area_id: parentBusinessArea.Id,
      permission: UserPermission.Edit,
    });

    this.companySettingsService.CheckCompanySettingsCompleted(user.company_id);

    return parentBusinessArea;
  }

  public async CreateSubBusinessArea(
    data: CreateSubBusinessAreaRequest,
    parentBusinessAreaId,
    user: IRedisUserModel,
    subdomain
  ): Promise<BusinessAreaModel> {
    let businessArea = await this.businessAreaRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (businessArea) {
      const message = "This Business Area name already exists.".replace(
        "Business Area",
        DomainConstants[subdomain].BusinessArea
      );
      throw new BadRequestException(message);
    }

    let subBusinessAreaModel = new BusinessAreaModel();
    subBusinessAreaModel.name = data.name;
    subBusinessAreaModel.parent_id = parentBusinessAreaId;
    subBusinessAreaModel.company_id = user.company_id;
    const subBusinessArea = await this.businessAreaRepository.Create(
      subBusinessAreaModel
    );

    return subBusinessArea;
  }

  public async UpdateBusinessArea(
    businessAreaId,
    data: UpdateBusinessAreaRequest,
    user: IRedisUserModel,
    subdomain: string
  ) {
    let businessAreas = await this.businessAreaRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (businessAreas.length) {
      if (businessAreas.find((ba) => ba.Id != businessAreaId)) {
        const message = "This Business Area already exists.".replace(
          "Business Area",
          DomainConstants[subdomain].BusinessArea
        );
        throw new BadRequestException(message);
      }
    }

    let businessAreaModel: BusinessAreaModel =
      await this.businessAreaRepository.FindOne({ Id: businessAreaId });

    if (!businessAreaModel) {
      throw new BadRequestException("Not Found");
    }

    businessAreaModel.name = data.name ? data.name : businessAreaModel.name;
    await this.businessAreaRepository.Save(businessAreaModel);

    return { business_area: businessAreaModel };
  }

  public async UpdateBusinessAreas(data: UpdateBusinessAreasRequest) {
    let businessAreas = [];
    for (
      let index = 0, len = data.business_areas.length;
      index < len;
      index++
    ) {
      let businessAreaModel: BusinessAreaModel =
        await this.businessAreaRepository.FindOne({
          Id: data.business_areas[index].Id,
        });
      if (!businessAreaModel) {
        continue;
      }
      businessAreaModel.name = data.business_areas[index].name
        ? data.business_areas[index].name
        : businessAreaModel.name;
      await this.businessAreaRepository.Save(businessAreaModel);
      businessAreas.push(businessAreaModel);
    }

    return { business_areas: businessAreas };
  }

  public async DeleteBusinessArea(
    businessAreaIds: number[],
    user: IRedisUserModel
  ) {
    await this.businessAreaRepository.DeleteBusinessArea(
      businessAreaIds,
      user.company_id
    );
    return null;
  }

  public async GetBusinessArea(
    businessAreaId: number
  ): Promise<BusinessAreaModel> {
    return await this.businessAreaRepository.FindById(businessAreaId, {
      alias: "ba",
      leftJoinAndSelect: {
        sub_business_area: "ba.sub_business_area",
      },
    });
  }

  public async GetBusinessAreas(
    data: GetBusinessAreasRequest,
    companyId
  ): Promise<{
    business_areas: number | any[];
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const [business_areas, count] =
      await this.businessAreaRepository.GetBusinessAreas(data, companyId);
    return {
      business_areas: business_areas,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchBusinessAreas(
    data: BusinessAreaSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    business_areas: Array<BusinessAreaModel>;
    page: number;
    limit: number;
  }> {
    const businessAreas = await this.businessAreaRepository.SearchBusinessArea(
      data,
      user.company_id
    );
    return {
      business_areas: businessAreas,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchFlatBusinessAreas(
    data: BusinessAreaSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    business_areas: Array<BusinessAreaModel>;
    page: number;
    limit: number;
  }> {
    const businessAreas =
      await this.businessAreaRepository.SearchFlatBusinessArea(
        data,
        user.company_id
      );
    return {
      business_areas: businessAreas,
      page: data.page,
      limit: data.limit,
    };
  }

  public async GetMostActiveBusinessAreas(data, user: IRedisUserModel) {
    const businessArea =
      await this.businessAreaRepository.GetMostActiveBusinessAreas(data, user);
    return businessArea;
  }

  public async GetAllBusinessAreaLevels(businessAreas, companyId) {
    const businessAreasIds =
      await this.businessAreaRepository.GetAllBusinessAreaLevels(
        businessAreas,
        companyId
      );
    return businessAreasIds;
  }

  public async GetUserBusinessAreas(
    data: UserBusinessAreasSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    business_areas: Array<BusinessAreaModel>;
  }> {
    const businessAreas = await this.businessAreaRepository.GetUserBusinessArea(
      data,
      user
    );
    return {
      business_areas: businessAreas,
    };
  }

  public async GetAncestors(data: {
    business_areas?: number[];
    communication_id?: number;
  }) {
    const businessAreas = await this.businessAreaRepository.GetAncestors(data);
    return businessAreas;
  }

  public async GetDecendentsByUserId(user: IRedisUserModel) {
    const businessAreaDecendentsIds =
      await this.businessAreaRepository.GetDecendentsByUserId(user);
    return businessAreaDecendentsIds;
  }

  public async GetBusinessAreaByCommunicationId(
    communicationId: number,
    select?: Array<string>
  ) {
    return await this.businessAreaRepository.GetBusinessAreaByCommunicationId(
      communicationId,
      select
    );
  }

  public async GetPlanBusinessAreas(
    planId: number,
    data: UserBusinessAreasSearchRequest,
    user: IRedisUserModel
  ) {
    const businessAreas =
      await this.businessAreaRepository.GetPlanBusinessAreas(
        planId,
        data,
        user
      );
    return businessAreas;
  }
}
