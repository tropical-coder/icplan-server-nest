import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { AnalyticsRequest } from "../../../api/controller/analytics/AnalyticsRequest";
import { GetRisksRequest, RiskOrderColumn } from "../../../api/controller/risk/RiskRequest";
import { GetPaginationOptions, JoinArrays } from "../../helpers/UtilHelper";
import { RiskModel, RiskStatus } from "../../model/risk/RiskModel";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import { BaseRepository } from "@app/common/base/base.repository";

@Injectable()
export class RiskRepository extends BaseRepository<RiskModel> {
  constructor(
    @InjectRepository(RiskModel)
    private riskModelRepository: Repository<RiskModel>,
  ) {
    super(riskModelRepository);
  }

  public async GetNextRiskNumber(companyId: number): Promise<number> {
    const seqName = `${companyId}_risk_number_seq`;
    // check if sequence exists
    const seqExists = await this.riskModelRepository.query(
      `SELECT sequencename FROM pg_sequences WHERE sequencename = '${seqName}'`
    );

    if (!seqExists.length) {
      await this.riskModelRepository.query(
        `CREATE SEQUENCE IF NOT EXISTS "${seqName}" START 2`
      );

      return 1;
    }

    const result = await this.riskModelRepository.query(
      `SELECT nextval('${companyId}_risk_number_seq')`
    );
    return +result[0].nextval;
  }

  public async GetRisks(data: GetRisksRequest, companyId: number) {
    const pagination = GetPaginationOptions(data);
    const riskQb = this.riskModelRepository.createQueryBuilder("risk")
      .select([
        "risk",
        "owner.Id",
        "owner.full_name",
        "owner.is_deleted",
        "owner.image_url",
      ])
      .addSelect("risk.impact * risk.likelihood", "score") // for orderby
      .leftJoin("risk.owner", "owner")
      .where("risk.company_id = :companyId", { companyId })
      .andWhere("risk.plan_id = :planId", { planId: data.plan_id });
    
    if (data.status) {
      riskQb.andWhere("risk.status = :status", { status: data.status });
    }

    if (data.risk_number) {
      riskQb.andWhere("risk.risk_number = :riskNumber", { riskNumber: data.risk_number });
    }

    if (data.owner_id) {
      riskQb.andWhere("risk.owner_id = :ownerId", { ownerId: data.owner_id });
    }

    const orderColumn = data.column === RiskOrderColumn.Score
      ? data.column
      : `risk.${data.column || "created_at"}`;

    riskQb.orderBy(orderColumn, data.direction || "ASC");

    const [risk, count] = await riskQb
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { risk, count };
  }

  public async GetRiskCategoryCount(planId: number, user: IRedisUserModel) {

    // Risk Category based on score:
    // Low <= 5
    // Medium <= 10
    // High <= 15
    // Critical > 15

    const riskCategoryCount = await this.riskModelRepository.query(`
      SELECT
        COALESCE(
          SUM(
            CASE WHEN risk.impact * risk.likelihood <= 5 THEN 1 ELSE 0 END), 0) AS low,
        COALESCE(
          SUM(
            CASE WHEN risk.impact * risk.likelihood > 5 AND risk.impact * risk.likelihood <= 10 THEN 1 ELSE 0 END), 0) AS medium,
        COALESCE(
          SUM(
            CASE WHEN risk.impact * risk.likelihood > 10 AND risk.impact * risk.likelihood <= 15 THEN 1 ELSE 0 END), 0) AS high,
        COALESCE(
          SUM(
            CASE WHEN risk.impact * risk.likelihood > 15 THEN 1 ELSE 0 END), 0) AS critical
      FROM risk
      WHERE risk.company_id = $1
        AND risk.plan_id = $2
    `, [user.company_id, planId]);

    return riskCategoryCount[0];
  }

  public async GetAnalyticsRiskCategoryCount(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {
    const filters = JoinArrays(data);
    const sql = `
      SELECT
        COALESCE(
          COUNT(DISTINCT CASE WHEN risk.impact * risk.likelihood <= 5 THEN risk."Id" END), 0
        ) AS low,
        COALESCE(
          COUNT(DISTINCT CASE WHEN risk.impact * risk.likelihood > 5 AND risk.impact * risk.likelihood <= 10 THEN risk."Id" END), 0
        ) AS medium,
        COALESCE(
          COUNT(DISTINCT CASE WHEN risk.impact * risk.likelihood > 10 AND risk.impact * risk.likelihood <= 15 THEN risk."Id" END), 0
        ) AS high,
        COALESCE(
          COUNT(DISTINCT CASE WHEN risk.impact * risk.likelihood > 15 THEN risk."Id" END), 0
        ) AS critical
      FROM risk
      LEFT JOIN plan p ON risk.plan_id = p."Id"
      ${user.role != UserRoles.Owner
          ? `INNER JOIN plan_permission pp ON pp.plan_id = p."Id" AND pp.user_id = ${user.Id}`
          : ""
      }
      LEFT JOIN plan_owner ON p."Id" = plan_owner.plan_id
      LEFT JOIN plan_team ON p."Id" = plan_team.plan_id
      ${data.tag?.length
          ? `
            INNER JOIN plan_tag AS plan_tag
              ON p."Id" = plan_tag.plan_id 
              AND plan_tag.tag_id IN (${filters.tag})`
          : ""
      }
      ${data.strategic_priority?.length
          ? `
            INNER JOIN plan_strategic_priority AS psp
              ON p."Id" = psp.plan_id 
              AND psp.strategic_priority_id IN (${filters.strategic_priority})`
          : ""
      }
      ${data.business_area?.length
          ? `LEFT JOIN plan_business_area pba ON pba.plan_id = p."Id"
            LEFT JOIN business_area ba ON pba.business_area_id = ba."Id"`
          : ""
      }
      WHERE p.company_id = ${user.company_id}
          AND p.start_date <= DATE('${data.end_date}') 
          AND (p.end_date >= DATE('${data.start_date}') OR p.ongoing)
          AND risk.status NOT IN ('${[
            RiskStatus.Resolved,
            RiskStatus.Closed,
            RiskStatus.Deferred
          ].join("','")}')
      ${user.role != UserRoles.Owner
          ? `AND (
              p.is_confidential != true
              OR plan_team.user_id = ${user.Id}
              OR plan_owner.user_id = ${user.Id}
            )`
          : ""
      }
      ${data.plan_id?.length 
          ? `AND p."Id" IN (${filters.plan_id})` 
          : ""}
      ${data.status?.length 
          ? `AND p.status IN ('${filters.status}')` 
          : ""}
      ${data.team?.length 
          ? `AND plan_team.user_id IN (${filters.team})` 
          : ""}
      ${data.owner?.length 
          ? `AND plan_owner.user_id IN (${filters.owner})` 
          : ""}
      ${data.business_area?.length 
          ? `AND (pba.business_area_id IN (${filters.business_area}) OR ba.parent_id IN (${filters.business_area}))` 
          : ''}
      ${data.parent_folder_id?.length 
          ? `AND p.parent_folder_id IN (${filters.parent_folder_id})` 
          : ''}
    `;

    const riskCategoryCount = await this.riskModelRepository.query(sql);
    return riskCategoryCount[0];
  }

  public async GetHighRiskPlans(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {
    const filters = JoinArrays(data);
    const sql = `
      WITH r AS (
       SELECT
          plan_id,
          SUM(impact * likelihood) AS score,
          COUNT("Id") AS risk_count
        FROM risk
        WHERE company_id = ${user.company_id}
          AND risk.status NOT IN ('${[
            RiskStatus.Resolved,
            RiskStatus.Closed,
            RiskStatus.Deferred
          ].join("','")}')
        GROUP BY plan_id
      )
      SELECT
        DISTINCT
        p."Id",
        p.title,
        COALESCE(r.score, 0) AS total_score,
        COALESCE(r.risk_count, 0) AS risk_count
      FROM plan p
      INNER JOIN r ON r.plan_id = p."Id"
      ${
        user.role != UserRoles.Owner
          ? `INNER JOIN plan_permission pp ON pp.plan_id = p."Id" AND pp.user_id = ${user.Id}`
          : ""
      }
      LEFT JOIN plan_owner ON p."Id" = plan_owner.plan_id
      LEFT JOIN plan_team ON p."Id" = plan_team.plan_id
      ${
        data.tag?.length
          ? `INNER JOIN plan_tag AS plan_tag
              ON p."Id" = plan_tag.plan_id 
              AND plan_tag.tag_id IN (${filters.tag})`
          : ""
      }
      ${
        data.strategic_priority?.length
          ? `INNER JOIN plan_strategic_priority AS psp
              ON p."Id" = psp.plan_id 
              AND psp.strategic_priority_id IN (${filters.strategic_priority})`
          : ""
      }
      ${
        data.business_area?.length
          ? `LEFT JOIN plan_business_area pba ON pba.plan_id = p."Id"
            LEFT JOIN business_area ba ON pba.business_area_id = ba."Id"`
          : ""
      }
      WHERE p.company_id = ${user.company_id}
        AND p.start_date <= DATE('${data.end_date}') 
        AND (p.end_date >= DATE('${data.start_date}') OR p.ongoing)
      ${
        user.role != UserRoles.Owner
          ? `AND (
              p.is_confidential != true
              OR plan_team.user_id = ${user.Id}
              OR plan_owner.user_id = ${user.Id}
            )`
          : ""
      }
      ${data.plan_id?.length ? `AND p."Id" IN (${filters.plan_id})` : ""}
      ${data.status?.length ? `AND p.status IN ('${filters.status}')` : ""}
      ${data.team?.length ? `AND plan_team.user_id IN (${filters.team})` : ""}
      ${data.owner?.length ? `AND plan_owner.user_id IN (${filters.owner})` : ""}
      ${
        data.business_area?.length
          ? `AND (pba.business_area_id IN (${filters.business_area}) OR ba.parent_id IN (${filters.business_area}))`
          : ""
      }
      ${
        data.parent_folder_id?.length
          ? `AND p.parent_folder_id IN (${filters.parent_folder_id})`
          : ""
      }
      ORDER BY total_score DESC, risk_count DESC
      LIMIT 25`;

    const highRiskPlans = await this.riskModelRepository.query(sql);
    return highRiskPlans;
  }
}