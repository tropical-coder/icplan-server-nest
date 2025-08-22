import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { CompanyUserLicenseModel } from "../entities/company_user_license.entity";

@Injectable()
export class CompanyUserLicenseRepository extends BaseRepository<CompanyUserLicenseModel> {
  constructor(
    @InjectRepository(CompanyUserLicenseModel)
    private companyUserLicenseRepository: Repository<CompanyUserLicenseModel>,
  ) {
    super(companyUserLicenseRepository);
  }

  public async GetSubDomainQuery(subDomains: string[]) {
    const result = await this.Repository.query(`
      SELECT
        sec."Id",
        sec.tenant_id,
        sec.certificate_url,
        sec.azure_issuer
      FROM
        company_user_license cul 
      LEFT JOIN company c
        ON c."Id" = cul.company_id
      INNER JOIN sso_enabled_companies sec
        ON cul.company_id = sec.company_id,
          jsonb_array_elements(settings->'subdomains') elements
      WHERE
        elements.value IN ('"${subDomains.join(`"','"`)}"')
        AND c.sso_allowed = True
      LIMIT 1
    `);

    return result.length ? result[0] : null;
  }

  public async GetCompaniesBySubDomain(subDomain: string) {
    const result = await this.Repository.createQueryBuilder(
      "company_user_license"
    )
      .select([
        "company_user_license.Id",
        "company_user_license.company_id",
        "company_user_license.settings",
      ])
      .where(
        "company_user_license.settings->'subdomains' @> to_jsonb(:subDomain::text)::jsonb",
        { subDomain }
      )
      .getMany();

    return result;
  }
}
