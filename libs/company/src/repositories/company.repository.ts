import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { LessThanOrEqual, SelectQueryBuilder } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { CompanyModel } from "../entities/company.entity";
import { GetPaginationOptions } from "@app/common/helpers/misc.helper";

@Injectable()
export class CompanyRepository extends BaseRepository<CompanyModel> {
  constructor(
    @InjectRepository(CompanyModel)
    private companyModelRepository: Repository<CompanyModel>,
  ) {
    super(companyModelRepository);
  }

  private loadCounts(qb: SelectQueryBuilder<CompanyModel>) {
    return qb
      .loadRelationCountAndMap(
        "company.user_count",
        "company.user",
        "user",
        (qb) => qb.andWhere("user.is_deleted = 0")
      )
      .loadRelationCountAndMap("company.audience_count", "company.audience")
      .loadRelationCountAndMap(
        "company.business_area_count",
        "company.businessArea"
      )
      .loadRelationCountAndMap("company.channel_count", "company.channel")
      .loadRelationCountAndMap("company.location_count", "company.location")
      .loadRelationCountAndMap(
        "company.strategic_priority_count",
        "company.strategicPriority"
      )
      .loadRelationCountAndMap("company.tag_count", "company.tag")
      .loadRelationCountAndMap("company.task_count", "company.task")
      .loadRelationCountAndMap("company.plan_count", "company.plan")
      .loadRelationCountAndMap("company.communication_count", "company.communication");
  }

  public async FindCompanyById(companyId: number): Promise<CompanyModel> {
    const companyQb = this.Repository.createQueryBuilder("company")
      .select([
        "company",
        "company_user_license",
        "subscription",
        "sso_company",
        "mfa_company",
        "package.Id",
        "package.name",
        "package.icon",
        "package.package_type",
        "package.trial_extension_seconds",
      ])
      .leftJoin("company.company_user_license", "company_user_license")
      .innerJoin("company.subscription", "subscription")
      .innerJoin("subscription.package", "package")
      .leftJoin("company.mfa_company","mfa_company")
      .leftJoin("company.sso_company", "sso_company")
      .where(`company."Id" = ${companyId}`);

    return await this.loadCounts(companyQb).getOne();
  }

  public async GetCompanyWithCounts(companyId: number): Promise<CompanyModel> {
    const companyQb = this.Repository.createQueryBuilder("company")
    .select([
      "company",
      "subscription",
    ])
    .innerJoin("company.subscription", "subscription")
    .where(`company."Id" = ${companyId}`)
  

    return await this.loadCounts(companyQb).getOne();
  }

  public async GetAllCompanies(data: GetCompaniesRequest) {
    const paginationParam = GetPaginationOptions(data);

    const queryBuilder = this.Repository.createQueryBuilder('company')
      .select([
        'company.Id',
        'company.name',
        'subscription.Id',
        'subscription.features',
        'subscription.valid_till',
        'package.Id',
        'package.name',
        'package.package_type',
      ])
      .loadRelationCountAndMap(
        "company.user_count",
        "company.user",
        "user",
        (qb) => qb.andWhere("user.is_deleted = 0")
      )
      .innerJoin("company.subscription", "subscription")
      .innerJoin("subscription.package", "package")
      .where('company.is_deleted = 0');

    if (data.name) {
      queryBuilder.andWhere('company.name ILIKE :name', { 
        name: `%${data.name}%`
      });
    }

    if (data.package_type) {
      queryBuilder.andWhere('package.package_type = :package_type', { 
        package_type: data.package_type
      });
    }

    if (data.package_id) {
      queryBuilder.andWhere('package.Id = :package_id', { 
        package_id: data.package_id
      });
    }

    queryBuilder.andWhere('company.is_active = :isActive', { isActive: data.is_active ?? true });

    queryBuilder
      .orderBy('company.name')
      .offset(paginationParam.offset)
      .limit(paginationParam.limit);

    const [companies, count] = await queryBuilder.getManyAndCount();

    return { companies, count };
  }

  public async GetUsersForExport(companyId: number) {
    const userInfo = await this.Repository.query(`
      SELECT
        u."Id" as "User Id",
        u.full_name as "Name",
        u.email as "Email",
        u."role" AS "Role",
        jsonb_agg(ba."name"::text) as "Business Area",
        jsonb_agg(ubap."permission"::text) as "Permission",
        to_char(to_timestamp(CEIL(u.last_login / 1000))::date, 'DD/MM/YYYY') as "Last Login",
        to_char(to_timestamp(CEIL(u.created_at / 1000))::date, 'DD/MM/YYYY') as "Invited on",
        (select count(*) from plan p where p.created_by = u."Id") as "Plan Created",
        (select count(*) from plan_owner po where po.user_id = u."Id") as "Plan Owner",
        (select count(*) from plan_team pt where pt.user_id = u."Id") as "Plan Team",
        (select count(*) from communication c where c.created_by = u."Id") as "Comms Created",
        (select count(*) from communication c where c.owner_id = u."Id") as "Comms Owner",
        (select count(*) from communication_team ct where ct.user_id = u."Id") as "Comms Team",
        (select count(*) from task t where t.assigned_to = u."Id") as "Task Assigned To"
      FROM "user" u 
      LEFT JOIN user_business_area_permission ubap 
        ON u."Id" = ubap.user_id
      LEFT JOIN business_area ba
        ON ubap.business_area_id = ba."Id" 
      WHERE u.company_id = ${companyId} AND u.is_deleted = 0
      GROUP BY u."Id", u.full_name, u.email
      ORDER BY u.full_name, u."Id";
    `);

    return userInfo;
  }

  public async GetBusinessAreasForExport(companyId: number) {
    const businessAreaInfo = await this.Repository.query(`
      SELECT
        ba."Id" AS "ba1_id",
        ba."name" AS "Primary Business Areas",
        ba2."Id" AS "ba2_id",
        ba2."name" AS "Secondary Business Areas",
        ba3.name as "Tertiary Business Areas"
      FROM "business_area" ba
      LEFT JOIN "business_area" ba2
        ON ba."Id" = ba2.parent_id
      LEFT JOIN "business_area" ba3
        ON ba2."Id" = ba3.parent_id
      WHERE
        ba.company_id = ${companyId}
        AND ba.parent_id IS null
        AND ba.is_deleted = 0
      ORDER BY ba."name", ba2."name", ba3."name";
    `);

    return businessAreaInfo;
  }

  public async GetLocationsForExport(companyId: number) {
    const locationInfo = await this.Repository.query(`
      SELECT
        loc."Id" as "loc1_id",
        loc."name" AS "Primary Location",
        loc2."Id" as "loc2_id",
        loc2."name" AS "Secondary Location",
        loc3.name AS "Tertiary Location"
      FROM "location" loc
      LEFT JOIN "location" loc2
        ON loc."Id" = loc2.parent_id
      LEFT JOIN "location" loc3
        ON loc2."Id" = loc3.parent_id
      WHERE loc.company_id = ${companyId}
        AND loc.parent_id IS null
        AND loc.is_deleted = 0
      ORDER BY loc."name", loc2."name", loc3."name";
    `);

    return locationInfo;
  }

  public async GetAudiencesForExport(companyId: number) {
    const audienceInfo = await this.Repository.query(`
      SELECT 
        a."Id",
        a."name" AS "Audience",
        ba."name" AS "Business Area"
      FROM audience a  
      LEFT JOIN audience_business_area aba 
        ON a."Id" = aba.audience_id 
      LEFT JOIN business_area ba 
        ON aba.business_area_id = ba."Id" 
      WHERE a.company_id = ${companyId}
      ORDER BY a."name", ba."name";
    `);

    return audienceInfo;
  }

  public async GetChannelsForExport(companyId: number) {
    const channelInfo = await this.Repository.query(`
      SELECT 
        c."Id",
        c."name" AS "Channel",
        c.description AS "Description",
        c.is_archive AS "Archive",
        ba."name" AS "Business Area"
      FROM channel c  
      LEFT JOIN channel_business_area cba 
        ON c."Id" = cba.channel_id 
      LEFT JOIN business_area ba 
        ON cba.business_area_id = ba."Id" 
      WHERE c.company_id = ${companyId}
      ORDER BY c.is_archive, c."name", ba."name";
    `);

    return channelInfo;
  }

  public async DeleteCompany(companies: CompanyModel[]) {
    await Promise.all(companies.map(({ Id }) => {
      return this.Repository.query(`
        DELETE FROM company WHERE "Id" = ${Id};
        DELETE FROM "user" WHERE company_id = ${Id};
        DELETE FROM "subscription" WHERE company_id = ${Id};
        DELETE FROM "saved_filter" WHERE company_id = ${Id};
        DELETE FROM "grid_media_contact" WHERE company_id = ${Id};
        DELETE FROM "user_activity_log" WHERE company_id = ${Id};
        DELETE FROM "phase" WHERE company_id = ${Id};
        DELETE FROM "channel" WHERE company_id = ${Id};
        DELETE FROM "business_area" WHERE company_id = ${Id};
        DELETE FROM "audience" WHERE company_id = ${Id};
        DELETE FROM "file" WHERE company_id = ${Id};
        DELETE FROM "content_type" WHERE company_id = ${Id};
        DELETE FROM "color" WHERE company_id = ${Id};
        DELETE FROM "key_messages" WHERE company_id = ${Id};
        DELETE FROM "company_user_license" WHERE company_id = ${Id};
        DELETE FROM "communication" WHERE company_id = ${Id};
        DELETE FROM "plan" WHERE company_id = ${Id};
        DELETE FROM "location" WHERE company_id = ${Id};
        DELETE FROM "mfa_enabled_companies" WHERE company_id = ${Id};
        DELETE FROM "parent_folder" WHERE company_id = ${Id};
        DELETE FROM "social_post" WHERE company_id = ${Id};
        DELETE FROM "sso_enabled_companies" WHERE company_id = ${Id};
        DELETE FROM "tag" WHERE company_id = ${Id};
        DELETE FROM "task" WHERE company_id = ${Id};
        DELETE FROM "subscription" WHERE company_id = ${Id};
        DELETE FROM "strategic_priority" WHERE company_id = ${Id};
      `);
    }));

    console.log("Deleted Companies:\n", companies.map((company) => company.name).join("\n"));

    return
  }
}
