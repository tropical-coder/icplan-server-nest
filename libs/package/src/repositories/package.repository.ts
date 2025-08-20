import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { GetPaginationOptions } from "../../helpers/UtilHelper";
import { PackageModel } from "../../model/package/PackageModel";
import { BaseRepository } from "@app/common/base/base.repository";

@Injectable()
export class PackageRepository extends BaseRepository<PackageModel> {
  constructor(
    @InjectRepository(PackageModel)
    private packageModelRepository: Repository<PackageModel>,
  ) {
    super(packageModelRepository);
  }

  public async GetPackages(param: PaginationParam, isAdmin: boolean) {
    const minPriceSubQuery = `(
      SELECT MIN(price.value) 
      FROM package_price price 
      WHERE price.package_id = package."Id" AND price.active = true
    )`;

    const paginationParam = GetPaginationOptions(param);
    const packagesQB = this.packageModelRepository.createQueryBuilder(
      "package"
    )
      .innerJoinAndSelect("package.package_detail", "package_detail")
      .leftJoinAndSelect(
        "package.prices",
        "prices",
        isAdmin ? undefined : "prices.active = true"
      )

    if (isAdmin) {
      packagesQB
        .orderBy("package.created_at", "DESC")
        .addOrderBy("package.active", "DESC")
    } else {
      packagesQB
        .addSelect(minPriceSubQuery, "min_price")
        .orderBy("min_price", "ASC")
    }

    const [packages, count] = await packagesQB
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return { packages, count };
  }

  public async GetPackageById(packageId: number, isAdmin: boolean) {
    return await this.packageModelRepository.createQueryBuilder("package")
      .innerJoinAndSelect("package.package_detail", "package_detail")
      .leftJoinAndSelect(
        "package.prices",
        "prices",
        isAdmin ? undefined : "prices.active = true"
      )
      .where('package."Id" = :packageId', { packageId })
      .getOne();
  }
}
