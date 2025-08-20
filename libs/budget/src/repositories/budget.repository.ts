import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BudgetModel } from "../../model/budget/BudgetModel";
import { BaseRepository } from "@app/common/base/base.repository";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import { AnalyticsRequest } from "../../../api/controller/analytics/AnalyticsRequest";
import { JoinArrays } from "../../helpers/UtilHelper";

export class BudgetRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(BudgetModel)
    private budgetModelRepository: Repository<BudgetModel>,
  ) {
    super([^Repository);
  }

  public async GetBudgets(planId: number, user: IRedisUserModel) {
    const budgetQuery = this.Repository.createQueryBuilder("budget")
      .select([
        "budget",
        "communication.Id",
        "communication.title",
      ])
      .leftJoin("budget.communication", "communication")
      .where("budget.company_id = :companyId", { companyId: user.company_id })
      .andWhere("budget.plan_id = :planId", { planId })
      .orderBy("budget.created_at", "DESC");

    return await budgetQuery.getMany();
  }

  public async GetPlanActualAndPlannedBudget(planId: number) {
    const budgetQuery = await this.Repository.query(`
      SELECT
      	plan."Id",
        CASE
          WHEN plan.budget_actual IS NULL THEN COALESCE(SUM(budget.actual), 0)
          ELSE plan.budget_actual
        END as actual,
        CASE 
	        WHEN SUM(budget.planned) IS NULL AND plan.budget_actual IS NOT NULL 
          THEN plan.budget_actual
          ELSE COALESCE(SUM(budget.planned), 0)
        END AS planned
      FROM plan
      LEFT JOIN budget ON budget.plan_id = plan."Id"
      WHERE plan."Id" = $1
      GROUP BY plan."Id";
    `, [planId]);

    return budgetQuery[0];
  }

  public async GetCompanyActualAndPlannedBudget(data: AnalyticsRequest, user: IRedisUserModel) {
    const filters = JoinArrays(data);
    const sql = `
      WITH plan_budgets AS (
        SELECT
          p."Id"                          AS plan_id,
          COALESCE(p.budget_actual, b.a)  AS actual,
          COALESCE(b.p, p.budget_actual, 0) AS planned
        FROM plan p
        LEFT JOIN (
          SELECT
            plan_id,
            SUM(actual)  AS a,
            SUM(planned) AS p
          FROM budget
          GROUP BY plan_id
        ) b ON b.plan_id = p."Id"
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
            ? `
            LEFT JOIN plan_business_area pba
                ON pba.plan_id = p."Id"
            LEFT JOIN business_area ba
                ON pba.business_area_id = ba."Id"`
            : ""
        }
        WHERE p.company_id = ${user.company_id}
            AND p.start_date <= DATE('${data.end_date}') 
            AND (p.end_date >= DATE('${data.start_date}') OR p.ongoing)
        ${user.role != UserRoles.Owner
            ? `AND (
                (p.is_confidential != true AND p.hide_budget = false)
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
        GROUP BY p."Id", p.budget_actual, p.budget_planned, b.a, b.p
      )
      SELECT
        COALESCE(SUM(planned), 0) AS total_planned,
        COALESCE(SUM(actual), 0)  AS total_actual
      FROM plan_budgets;
    `;

    const budgetQuery = await this.Repository.query(sql);
    return budgetQuery[0];
  }
}
