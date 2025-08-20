import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { AdminActivityLogModel } from "../../model/activity_log/AdminActivityLogModel";
import { GetPaginationOptions } from "../../helpers/UtilHelper";
import { GetAdminActivityLogsRequest } from "../../../admin/controller/activity_log/ActivityLogRequest";

export class AdminActivityLogRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(AdminActivityLogModel)
    private adminActivityLogModelRepository: Repository<AdminActivityLogModel>,
  ) {
    super([^Repository);
  }

  public async GetActivityLogs(params: GetAdminActivityLogsRequest) {
    const pagination = GetPaginationOptions(params);
    
    const logQb = this.Repository.createQueryBuilder("log");
      logQb.where("1 = 1");

    
    if (params.start_date) {
      logQb.andWhere("log.timestamp >= :start_date", { start_date: params.start_date });
    }
    if (params.end_date) {
      logQb.andWhere("log.timestamp <= :end_date", { end_date: params.end_date });
    }
    if (params.entity) {
      logQb.andWhere("log.entity = :entity", { entity: params.entity });
    }
    const [logs, count] = await logQb.orderBy("log.timestamp", "DESC")
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { logs, count };
  }
}