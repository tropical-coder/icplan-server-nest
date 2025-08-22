import { BaseRepository } from "@app/common/base/base.repository";
import { KeyMessagesModel } from "../entities/key_messages.entity";
import { GetPaginationOptions } from "@app/common/helpers/misc.helper";
import { KeyMessaging } from "../entities/key_messages.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IRedisUserModel } from "@app/user/entities/user.entity";
import { GetKMRequest } from "../dtos/key_messages.dto";

export class KeyMessagesRepository extends BaseRepository<KeyMessagesModel> {
  constructor(
    @InjectRepository(KeyMessagesModel)
    private keyMessagesModelRepository: Repository<KeyMessagesModel>,
  ) {
    super(keyMessagesModelRepository);
  }

  public async GetKeyMessagesHistory(data: GetKMRequest, kmType: KeyMessaging, user: IRedisUserModel) {
    const pagination = GetPaginationOptions(data);
    const query = this.Repository.createQueryBuilder("km")
      .where("km.company_id = :companyId", { companyId: user.company_id })
      .andWhere("km.is_deleted = 0");

    query.andWhere(`km.date IS ${kmType == KeyMessaging.Basic ? "NULL" : "NOT NULL"}`);

    if (data.start_date && data.end_date) {
      query.andWhere("km.date BETWEEN :startDate AND :endDate", {
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
      });
    }

    query.orderBy("km.date", "ASC")
      .skip(pagination.offset)
      .take(pagination.limit);

    const [key_messages, count] = await query.getManyAndCount();
    return { key_messages, count };
  }

  public async GetNearestKeyMessage(user: IRedisUserModel): Promise<KeyMessagesModel> {
    const km = await this.Repository.createQueryBuilder("km")
      .where("km.company_id = :companyId", { companyId: user.company_id })
      .andWhere("km.date IS NOT NULL")
      .orderBy("ABS(km.date - CURRENT_DATE)", "ASC") // sort by closest date
      .addOrderBy("km.date - CURRENT_DATE < 0", "ASC") // if tie, then future KM is preferred
      .limit(1)
      .getOne();

    return km;
  }
}
