import { BaseRepository } from "@app/common/base/base.repository";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserSettingModel } from "../entities/user_setting.entity";

export class UserSettingRepository extends BaseRepository<UserSettingModel> {
  constructor(
    @InjectRepository(UserSettingModel)
    private readonly userSettingRepository: Repository<UserSettingModel>,
  ) {
    super(userSettingRepository);
  }
}