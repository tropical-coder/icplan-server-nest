import { AdminModel } from "../entities/administrator.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { BaseRepository } from "@app/common/base/base.repository";
import { Repository } from "typeorm";

@Injectable()
export class AdministratorRepository extends BaseRepository<AdminModel> {
  constructor(
    @InjectRepository(AdminModel)
    private adminRepository: Repository<AdminModel>,
  ) {
    super(adminRepository);
  }

  public async GetAdmins(filters, paginationParam) {
    const adminsQuery = this.Repository.createQueryBuilder("admin").where(
      "admin.is_deleted = 0"
    );
    if (filters.name) {
      adminsQuery.andWhere(
        `LOWER(full_name) LIKE '%${filters.name.toLowerCase()}%'`
      );
    }

    if (filters.is_active) {
      adminsQuery.andWhere(
        `is_active = ${filters.is_active == "0" ? false : true}`
      );
    }

    adminsQuery.orderBy("admin.full_name");
    adminsQuery.skip(paginationParam.offset);
    adminsQuery.take(paginationParam.limit);

    let [admins, count] = await adminsQuery.getManyAndCount();
    return { admins, count };
  }
}
