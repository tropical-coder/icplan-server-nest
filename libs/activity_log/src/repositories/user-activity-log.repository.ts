import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { UserActivityLogModel } from "../../model/activity_log/UserActivityLogModel";
import { appEnv } from "../../helpers/EnvHelper";
import * as moment from "moment";
import { LessThanOrEqual } from "typeorm";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { GetPaginationOptions } from "../../helpers/UtilHelper";
import { GetUserActivityLogsRequest } from "../../../admin/controller/activity_log/ActivityLogRequest";

export class UserActivityLogRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(UserActivityLogModel)
    private userActivityLogModelRepository: Repository<UserActivityLogModel>,
  ) {
    super([^Repository);
  }

  public async GetActivityLogs(params: GetUserActivityLogsRequest) {
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
    if (params.company_id) {
      logQb.andWhere("log.company_id = :company_id", { company_id: params.company_id });
    }
    const [logs, count] = await logQb.orderBy("log.timestamp", "DESC")
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { logs, count };
  }

  public async DeleteOldLogs() {
    const logRetentionDays = appEnv("LOG_RETENTION_DAYS");
    if (!logRetentionDays) {
      console.log("Log deletion is disabled");
      return;
    }

    const date = moment().subtract(logRetentionDays, "days").toDate();
    await this.Delete({ timestamp: LessThanOrEqual(date) }, false);

    return true;
  }
}