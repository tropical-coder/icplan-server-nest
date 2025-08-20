import { IRedisUserModel, UserModel, UserRoles } from "../../model/user/UserModel";
import { SavedFilterRepository } from "../../repository/saved_filter/SavedFilterRepository";

import { CreateSavedFilterRequest, GetSavedFiltersRequest, RenameSavedFilterRequest } from "../../../api/controller/saved_filter/SavedFilterRequest";
import { BadRequestException } from "routing-controllers";
import { DefaultSavedFilter, SavedFilterModel } from "../../model/saved_filter/SavedFilterModel";
import { ILike, IsNull, Not } from "typeorm";
import { PinnedSavedFilterModel } from "../../model/saved_filter/PinnedSavedFilterModel";
import { PinnedSavedFilterRepository } from "../../repository/saved_filter/PinnedSavedFilterRepository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SavedFilterService {
  constructor(
    private savedFilterRepository: SavedFilterRepository,
    private pinnedSavedFilterRepository: PinnedSavedFilterRepository,
  ) {}

  public async GetSavedFilters(data: GetSavedFiltersRequest, user: IRedisUserModel) {
    const savedFilters = await this.savedFilterRepository.GetSavedFilters(
      data,
      user,
    );

    return savedFilters;
  }

  public async CreateSavedFilter(
    data: CreateSavedFilterRequest,
    user: IRedisUserModel,
  ) {
    let [savedFilter, count] = await Promise.all([
      this.savedFilterRepository.FindOne([
        { user_id: IsNull(), company_id: user.company_id, name: ILike(data.name) },
        { user_id: user.Id, company_id: user.company_id, name: ILike(data.name) }
      ]),
      this.savedFilterRepository.Count({
        user_id: user.Id,
      }),
    ]);

    if (savedFilter) {
      throw new BadRequestException(`Filter with name '${data.name}' already exists.`);
    }

    if (count >= 30) {
      throw new BadRequestException("You cannot have more than 30 saved filters.");
    }

    savedFilter = new SavedFilterModel();
    savedFilter.user_id = user.Id;
    savedFilter.name = data.name;
    savedFilter.filters = data.filters;
    savedFilter.company_id = user.company_id;
    savedFilter.created_by = user.Id;
    savedFilter = await this.savedFilterRepository.Save(savedFilter);

    return savedFilter;
  }

  public async RenameSavedFilter(
    savedFilterId: number,
    data: RenameSavedFilterRequest,
    user: IRedisUserModel,
  ) {
    const savedFilter = await this.savedFilterRepository.FindOne({
      Id: savedFilterId,
      company_id: user.company_id,
    });

    if (!savedFilter) {
      throw new BadRequestException("Filter not found.");
    }

    // Check user role if it's a company filter.
    if (!savedFilter.user_id && ![UserRoles.Owner, UserRoles.Admin].includes(user.role)) {
      throw new BadRequestException("You don't have permission to rename this filter.");
    }

    // Check user id if it's a user filter.
    if (savedFilter.user_id && savedFilter.user_id != user.Id) {
      throw new BadRequestException("You don't have permission to rename this filter.");
    }

    // Check if it's a default filter.
    const defaultFilters: string[] = Object.values(DefaultSavedFilter);
    if (defaultFilters.includes(savedFilter.name)) {
      throw new BadRequestException("Default filter cannot be renamed or deleted.");
    }

    // Check if new name already exists.
    const and = { Id: Not(savedFilterId), company_id: user.company_id, name: ILike(data.name) };
    const duplicateFilter = await this.savedFilterRepository.FindOne([
      { user_id: user.Id, ...and },
      { user_id: IsNull(), ...and },
    ]);

    if (duplicateFilter) {
      throw new BadRequestException(`Filter with name '${data.name}' already exists.`);
    }

    savedFilter.name = data.name;
    await this.savedFilterRepository.Update(
      { Id: savedFilterId },
      { name: savedFilter.name }
    );

    return savedFilter;
  }

  public async PinSavedFilter(
    savedFilterId: number,
    user: IRedisUserModel
  ) {
    const savedFilter = await this.savedFilterRepository.GetSavedFilterById(savedFilterId, user);
    if (!savedFilter) {
      throw new BadRequestException("Filter not found.");
    }

    await this.pinnedSavedFilterRepository.Update(
      { user_id: user.Id },
      { saved_filter_id: savedFilterId }
    );

    const pinnedSavedFilterModel = new PinnedSavedFilterModel();
    pinnedSavedFilterModel.user_id = user.Id;
    pinnedSavedFilterModel.saved_filter_id = savedFilterId;
  
    savedFilter.pinned_saved_filters = [pinnedSavedFilterModel];
    return savedFilter;
  }

  public async DeleteSavedFilter(savedFilterId: number, user: IRedisUserModel) {
    const savedFilter = await this.savedFilterRepository.GetSavedFilterById(savedFilterId, user);

    if (!savedFilter) {
      throw new BadRequestException("Filter not found.");
    }

    if (!savedFilter.user_id && ![UserRoles.Owner, UserRoles.Admin].includes(user.role)) {
      throw new BadRequestException("You don't have permission to delete this filter.");
    }

    const defaultFilters: string[] = Object.values(DefaultSavedFilter);
    if (defaultFilters.includes(savedFilter.name)) {
      throw new BadRequestException("Default filter cannot be renamed or deleted.");
    }

    // Pin "All Plans" filter if the deleted one was pinned.
    await this.pinnedSavedFilterRepository.PinAllPlansFilter(savedFilterId);

    await this.savedFilterRepository.DeleteById(savedFilterId, false);

    return true;
  }

  public async GenerateDefaultFilters(newUserModel: UserModel) {
    const allPlans = new SavedFilterModel();
    allPlans.user_id = newUserModel.Id;
    allPlans.name = DefaultSavedFilter.AllPlans;
    allPlans.filters = {};
    allPlans.company_id = newUserModel.company_id;
    allPlans.created_by = newUserModel.Id;

    await this.savedFilterRepository.Create(allPlans);

    const pinAllPlans = new PinnedSavedFilterModel();
    pinAllPlans.user_id = newUserModel.Id;
    pinAllPlans.saved_filter_id = allPlans.Id;
    await this.pinnedSavedFilterRepository.Create(pinAllPlans);

    return true;
  }

  public async GetSavedFilterById(savedFilterId: number, user: IRedisUserModel) {
    const savedFilter = await this.savedFilterRepository.GetSavedFilterById(
      savedFilterId,
      user,
    );

    if (!savedFilter) {
      throw new BadRequestException("Filter not found.");
    }

    return savedFilter;
  }

  public async UpdateSavedFilter(
    savedFilterId: number, 
    filters: any, 
    user: IRedisUserModel
  ) {
    const savedFilter = await this.savedFilterRepository.GetSavedFilterById(savedFilterId, user);

    if (!savedFilter) {
      throw new BadRequestException("Filter not found.");
    }
    
    // Check user role if it's a company filter.
    if (!savedFilter.user_id && ![UserRoles.Owner, UserRoles.Admin].includes(user.role)) {
      throw new BadRequestException("You don't have permission to edit this filter.");
    }

    const defaultFilters: string[] = Object.values(DefaultSavedFilter);
    if (defaultFilters.includes(savedFilter.name)) {
      throw new BadRequestException("Default filter cannot be edited.");
    }

    savedFilter.filters = filters;
    await this.savedFilterRepository.Update(
      { Id: savedFilterId, company_id: user.company_id },
      { filters: savedFilter.filters }
    );

    return savedFilter;
  }

  public async CreateCompanySavedFilter(data: CreateSavedFilterRequest, user: IRedisUserModel) {
    let savedFilter = await this.savedFilterRepository.FindOne({
      company_id: user.company_id,
      user_id: IsNull(),
      name: ILike(data.name),
    });

    if (savedFilter) {
      throw new BadRequestException(`Filter with name '${data.name}' already exists.`);
    }

    savedFilter = new SavedFilterModel();
    savedFilter.company_id = user.company_id;
    savedFilter.name = data.name;
    savedFilter.filters = data.filters;
    savedFilter.user_id = null;
    savedFilter.created_by = user.Id;
    savedFilter = await this.savedFilterRepository.Create(savedFilter);

    return savedFilter;
  }
}