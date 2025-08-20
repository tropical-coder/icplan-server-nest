import { PinFolderModel } from '../../model/parent_folder/PinFolderModel';
import { BadRequestException } from "routing-controllers";
import { ParentFolderRepository } from "../../repository/parent_folder/ParentFolderRepository";
import { PlanRepository } from "../../repository/plan/PlanRepository";

import { ParentFolderModel } from "../../model/parent_folder/ParentFolderModel";
import {
  CreateParentFolderRequest,
  UpdateParentFolderRequest,
  ParentFolderSearchRequest,
  GetParentFolderAndPlanRequest,
  PinFolderRequest,
  ParentFolderPage,
} from "../../../api/controller/parent_folder/ParentFolderRequest";
import { LocationService } from "../location/LocationService";
import { BusinessAreaService } from "../business_area/BusinessAreaService";
import { IRedisUserModel } from "../../model/user/UserModel";
import { CheckUserPermissionForMultiplePlans } from "../../helpers/PermissionHelper";
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { CommunicationRepository } from "../../repository/communication/CommunicationRepository";
import { UserRepository } from "../../repository/user/UserRepository";
import { In } from "typeorm";
import { PinFolderRepository } from "../../repository/parent_folder/PinFolderRepository";
import { DeepClone } from "../../helpers/UtilHelper";

@Injectable()
export class ParentFolderService {
  constructor(
    private parentFolderRepository: ParentFolderRepository,
    private planRepository: PlanRepository,
    private planPermissionRepository: PlanPermissionRepository,
    private locationService: LocationService,
    private businessAreaService: BusinessAreaService,
    private communicationRepository: CommunicationRepository,
    private userRepository: UserRepository,
    private pinFolderRepository: PinFolderRepository,
  ) {}

  public async CreateParentFolder(
    data: CreateParentFolderRequest,
    user: IRedisUserModel
  ): Promise<ParentFolderModel> {
    let parent_folderExists = await this.parentFolderRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
      ...(data.parent_folder_id && { parent_folder_id: data.parent_folder_id }),
    });

    if (parent_folderExists) {
      throw new BadRequestException("This Folder name already exists.");
    }

    let parentFolderModel = new ParentFolderModel();
    parentFolderModel.company_id = user.company_id;
    parentFolderModel.name = data.name;
    parentFolderModel.description = data.description || "";
    parentFolderModel.created_by = user.Id;
    parentFolderModel.parent_folder_id = data.parent_folder_id || null;

    const parent_folder = await this.parentFolderRepository.Create(
      parentFolderModel
    );

    parentFolderModel.sub_folder = [];
    return parent_folder;
  }

  public async UpdateParentFolder(
    parent_folderId,
    data: UpdateParentFolderRequest,
    user: IRedisUserModel
  ) {
    let parent_folders = await this.parentFolderRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (data.parent_folder_id || data.parent_folder_id === 0) {
      if (parent_folders.find((df) => df.Id === data.parent_folder_id)) {
        throw new BadRequestException(
          "This Folder already exists in parent folder."
        );
      }
    }
    if (parent_folders.length) {
      if (parent_folders.find((pf) => pf.Id != parent_folderId)) {
        throw new BadRequestException("This Parent Folder already exists.");
      }
    }

    let parentFolderModel: ParentFolderModel =
      await this.parentFolderRepository.FindOne({
        Id: parent_folderId,
      });

    if (!parentFolderModel) {
      throw new BadRequestException("Not Found");
    }

    parentFolderModel.name = data.name || parentFolderModel.name;
    parentFolderModel.description =
      data.description || parentFolderModel.description;
    parentFolderModel.updated_by = user.Id;
    parentFolderModel.parent_folder_id = data.parent_folder_id
      ? data.parent_folder_id
      : parentFolderModel.parent_folder_id;
    await this.parentFolderRepository.Save(parentFolderModel);

    return { parent_folder: parentFolderModel };
  }

  public async DeleteParentFolder(
    parentFolderId: number,
    user: IRedisUserModel
  ) {
    const [folders, plans] = await Promise.all([
      this.parentFolderRepository.GetFolderDescendants(parentFolderId, user),
      this.planRepository.GetAllPlansByParentFolderId(parentFolderId, user),
    ]);

    if (plans.length) {
      const planIds = plans.map(({ Id }) => Id);

      await CheckUserPermissionForMultiplePlans(this, planIds, user);

      await this.communicationRepository.Delete(
        { plan_id: In(planIds), company_id: user.company_id },
        false
      );
      await this.planRepository.DeleteByIds(planIds, false);
    }

    await this.parentFolderRepository.DeleteByIds(
      folders.map(({ Id }) => Id),
      false,
    );
    return null;
  }

  public async GetParentFoldersAndPlans(
    data: GetParentFolderAndPlanRequest,
    user: IRedisUserModel
  ): Promise<{
    parentFolders: ParentFolderModel[];
    planCount: any;
    communicationCount: any;
    dashboard: Record<string, number>;
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

    const [folders, { plans }] = await Promise.all([
      this.parentFolderRepository.GetParentFolders(data, user),
      this.planRepository.GetParentFolderPlans(data, user),
    ]);

    if (!folders.length && !plans.length) {
      return {
        parentFolders: [],
        planCount: [],
        communicationCount: [],
        dashboard: null,
      };
    }

    let parentFolderIds: Number[] = [0];
    folders.forEach((folder) => {
      parentFolderIds.push(folder.Id);
      folder.sub_folder?.forEach((sf) => {
        parentFolderIds.push(sf.Id);
      });
    });

    let planIds: number[] = [];
    plans.forEach((plan) => {
      planIds.push(plan.Id);
    });

    let [parentFolders, planCount, communicationCount, dashboard] =
      await Promise.all([
        this.parentFolderRepository.GetParentFoldersAndPlans(
          data,
          parentFolderIds,
          planIds,
          user,
        ),
        this.parentFolderRepository.GetPlanCount(parentFolderIds, user),
        this.planRepository.GetPlanCommunicationCount(planIds, user),
        this.planRepository.GetDashboardData(
          data,
          user,
        ),
      ]);

    return { parentFolders, planCount, communicationCount, dashboard };
  }

  public async GetParentFoldersAndPlansDashboard(
    data: GetParentFolderAndPlanRequest,
    user: IRedisUserModel
  ): Promise<{
    dashboard: Record<string, number>;
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

    let dashboard = await this.planRepository.GetDashboardData(
      data,
      user,
    );

    return { dashboard };
  }

  public async SearchParentFolder(
    data: ParentFolderSearchRequest,
    user: IRedisUserModel
  ): Promise<ParentFolderModel[]>  {
    const parentFolders = await this.parentFolderRepository.SearchParentFolder(
      data,
      user.company_id
    );
    return parentFolders;
  }

  public async PinParentFolders(
    data: PinFolderRequest,
    user: IRedisUserModel,
  ): Promise<ParentFolderModel[]> {
    const pinFolders = data.parent_folder_id.map((pf_id) => {
      const pinFolder = new PinFolderModel();
      pinFolder.user_id = user.Id;
      pinFolder.parent_folder_id = pf_id;
      return pinFolder;
    });

    await this.pinFolderRepository.Upsert(pinFolders, [
      "user_id",
      "parent_folder_id",
    ]);

    const parentFolders = await this.parentFolderRepository.Find({
      Id: In(data.parent_folder_id),
    });

    return parentFolders;
  }

  public async UnpinParentFolders(
    data: PinFolderRequest,
    user: IRedisUserModel
  ): Promise<boolean> {
    if (!data.parent_folder_id.length) {
      return true;
    }

    await this.pinFolderRepository.Delete(
      {
        user_id: user.Id,
        parent_folder_id: In(data.parent_folder_id),
      },
      false
    );

    return true;
  }

  public async GetParentFoldersHomepage(
    data: GetParentFolderAndPlanRequest,
    user: IRedisUserModel
  ) {
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

    const filtersCopy = DeepClone(data);

    const isFilterApplied = 
      Object.keys(filtersCopy).some((key) => {
        if (["column", "direction", "page_type"].includes(key)) {
          return false;
        }
        return filtersCopy[key] != undefined
      });
  
    const parentFolderIdsQuery = 
      this.planRepository.GetParentFoldersIdsFromPlansQuery(data, user);

    let currentFolderPromise, currentFolderAncestorsPromise;
    if (filtersCopy.page_type != ParentFolderPage.Homepage) {
      currentFolderPromise = this.parentFolderRepository.FindOne({ 
        Id: filtersCopy.parent_folder_id[0], 
        company_id: user.company_id 
      });
      currentFolderAncestorsPromise = this.parentFolderRepository.GetFolderAncestors(
        filtersCopy.parent_folder_id[0],
        user.company_id
      );
    }

    const [pinned, unpinned, currentFolder, currentFolderAncestors] = await Promise.all([
      this.parentFolderRepository.GetParentFolders(
        filtersCopy,
        user,
        parentFolderIdsQuery,
        true,
        isFilterApplied
      ),
      this.parentFolderRepository.GetParentFolders(
        filtersCopy,
        user,
        parentFolderIdsQuery,
        false,
        isFilterApplied
      ),
      currentFolderPromise,
      currentFolderAncestorsPromise,
    ]);

    const [pinnedPlanCount, unpinnedPlanCount] = await Promise.all([
      this.parentFolderRepository.GetPlanCount(pinned.map(({ Id }) => Id), user),
      this.parentFolderRepository.GetPlanCount(unpinned.map(({ Id }) => Id), user),
    ]);

    return {
      pinned,
      unpinned,
      pinnedPlanCount,
      unpinnedPlanCount,
      currentFolder,
      currentFolderAncestors,
    };
  }
}
