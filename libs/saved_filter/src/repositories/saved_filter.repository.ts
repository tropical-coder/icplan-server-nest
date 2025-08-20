import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { Brackets } from "typeorm";
import { GetPaginationOptions } from "../../helpers/UtilHelper";
import {
import { IRedisUserModel } from "../../model/user/UserModel";
import { BaseRepository } from "@app/common/base/base.repository";
import { GetSavedFiltersRequest } from "../../../api/controller/saved_filter/SavedFilterRequest";

export class SavedFilterRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(SavedFilterModel)
    private savedFilterModelRepository: Repository<SavedFilterModel>,
  ) {
    super([^Repository);
  }

  public async GetSavedFilters(
    data: GetSavedFiltersRequest,
    user: IRedisUserModel
  ): Promise<{
    saved_filter: SavedFilterModel[];
    count: number;
  }> {
    const paginationParam = GetPaginationOptions(data);

    const [saved_filter, count] = await this.Repository.createQueryBuilder(
      "saved_filter"
    )
      .addSelect(`(saved_filter.name = '${DefaultSavedFilter.AllPlans}')`, "is_default")
      .leftJoinAndSelect(
        "saved_filter.pinned_saved_filters",
        "pinned_saved_filters",
        "pinned_saved_filters.user_id = :userId",
        { userId: user.Id }
      )
      .where("saved_filter.company_id = :companyId", {
        companyId: user.company_id,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where("saved_filter.user_id IS NULL");
          if (data.company_filters_only != true) {
            qb.orWhere("saved_filter.user_id = :userId", { userId: user.Id });
          }
        })
      )
      .orderBy(`is_default`, "DESC")
      .addOrderBy("pinned_saved_filters.user_id")
      .addOrderBy("saved_filter.name", "ASC")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return { saved_filter, count };
  }

  public async GetSavedFilterById(
    savedFilterId: number,
    user: IRedisUserModel
  ): Promise<SavedFilterModel> {
    const savedFilter = await this.Repository.createQueryBuilder("saved_filter")
      .leftJoinAndSelect(
        "saved_filter.pinned_saved_filters",
        "pinned_saved_filters",
        "pinned_saved_filters.user_id = :userId",
        { userId: user.Id }
      )
      .where("saved_filter.Id = :savedFilterId", { savedFilterId })
      .andWhere("saved_filter.company_id = :companyId", {
        companyId: user.company_id,
      })
      .andWhere(
        `(saved_filter.user_id = :userId OR saved_filter.user_id IS NULL)`,
        {
          userId: user.Id,
        }
      )
      .getOne();

    return savedFilter;
  }
}
