import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { PlanAndCommunicationSearchRequest } from "../../../api/controller/plan/PlanRequest";
import { BaseRepository } from "@app/common/base/base.repository";
import { PlanModel, PlanStatus, RAGBStatus } from "../../model/plan/PlanModel";
import {
import { CommunicationStatus } from "../../model/communication/CommunicationModel";
import {
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import {

export class PlanRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(PlanModel)
    private planModelRepository: Repository<PlanModel>,
  ) {
    super([^Repository);
  }

  public async GetPlanCommunicationCount(
    planIds: number[],
    user: IRedisUserModel
  ) {
    const planIdsQuery = `
      SELECT plan."Id" AS id,
        COUNT(comm."Id") AS communication_count,
        /* all below selects to be removed after FE approval */
        (
          SELECT COALESCE(Sum(budget.actual), 0)
          FROM budget
          WHERE budget.plan_id = plan."Id"
        ) AS plan_budget_actual,
        Sum(CASE WHEN comm.status = '${
          CommunicationStatus.Planned
        }' THEN 1 ELSE 0 END) AS planned_communication_count,
        Sum(CASE WHEN comm.status = '${
          CommunicationStatus.Complete
        }' THEN 1 ELSE 0 END) AS complete_communication_count,
        Sum(CASE WHEN comm.status = '${
          CommunicationStatus.InProgress
        }' THEN 1 ELSE 0 END) AS in_progress_communication_count,
        Sum(CASE WHEN comm.status = '${
          CommunicationStatus.Archived
        }' THEN 1 ELSE 0 END) AS archived_communication_count
      FROM plan
      LEFT JOIN communication AS comm
        ON comm.plan_id = plan."Id"
      INNER JOIN communication_permission AS comm_perm
        ON comm."Id" = comm_perm.communication_id
        AND comm_perm.user_id = ${user.Id}
      LEFT JOIN communication_team AS comm_team
        ON comm."Id" = comm_team.communication_id
        AND comm_team.user_id = ${user.Id}
      WHERE plan.company_id = ${user.company_id}
        AND plan."Id" IN (${planIds.length ? planIds.join(",") : 0})
        AND (
          comm.is_confidential = false
          OR comm_team.user_id = ${user.Id}
          OR comm.owner_id = ${user.Id}
        )
      GROUP BY plan."Id"`;

    let communicationCount = await this.Repository.query(planIdsQuery);

    return communicationCount;
  }

  public async FindPlansByStatus(status, user: IRedisUserModel) {
    let planQuery = this.Repository.createQueryBuilder("plan")
      .select(["plan"])
      .leftJoinAndSelect("plan.business_areas", "plan_business_areas")
      .leftJoinAndSelect("plan.tags", "plan_tags")
      .leftJoinAndSelect("plan.team", "plan_team")
      .leftJoinAndSelect(
        "plan.strategic_priorities",
        "plan_strategic_priorities"
      )
      .leftJoinAndSelect("plan.files", "files")
      .leftJoinAndSelect("files.file", "file")
      .leftJoinAndSelect("plan.owner", "owner")
      .leftJoin("plan.communications", "communication")
      .leftJoin("communication.business_areas", "business_area");

    if (doApplyBusinessAreaPermission(user)) {
      planQuery.leftJoin(
        "plan_business_areas.business_area_permission",
        "plan_business_area_permission"
      );
      planQuery.leftJoin(
        "business_area.business_area_permission",
        "comm_business_area_permission"
      );
    }

    planQuery.where(`plan.company_id = ${user.company_id}`);
    planQuery.andWhere(`plan.status IN ('${status.join("','")}')`);

    if (doApplyBusinessAreaPermission(user)) {
      planQuery.andWhere(
        `(
					plan_business_area_permission.user_id = ${user.Id} OR
					comm_business_area_permission.user_id = ${user.Id}
				)`
      );
    }

    planQuery.orderBy("plan.title", "ASC");

    const [plans, count] = await planQuery.getManyAndCount();

    let planIds = plans.map(({ Id }) => Id);

    let communicationCount = await this.GetPlanCommunicationCount(
      planIds,
      user
    );

    return [plans, communicationCount, count];
  }

  public async GetPlans(
    data: GetPlanRequest,
    user: IRedisUserModel
  ): Promise<[any[], number]> {
    const { offset, limit } = GetPaginationOptions(data);
    const filters = JoinArrays(data);

    const sql = `
      SELECT
        COUNT(*) OVER()::int AS total_count,
        p."Id", p.title, p.start_date, p.ongoing, p.end_date, p.status, p.color,
        COALESCE(team.team_members, '[]'::jsonb)       AS team,
        COALESCE(owner.owners,      '[]'::jsonb)       AS owner,
        COALESCE(ba.ba_list,        '[]'::jsonb)       AS business_areas,
        COALESCE(tags.tag_list,     '[]'::jsonb)       AS tags,
        COALESCE(sp.sp_list,        '[]'::jsonb)       AS strategic_priorities
      FROM plan p
      INNER JOIN plan_permission pp
        ON pp.plan_id = p."Id" AND pp.user_id = ${user.Id}
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(c."Id") AS communication_ids
        FROM communication c
        INNER JOIN communication_permission cp
          ON cp.communication_id = c."Id" AND cp.user_id = ${user.Id}
        ${
          data.show_on_grid 
          ? `INNER JOIN communication_grid cg
               ON cg.communication_id = c."Id" AND cg.show_on_grid = true
          `: ""
        }
        WHERE c.plan_id = p."Id"
        AND (
          ${user.role == UserRoles.Owner}
          OR c.is_confidential = false
          OR EXISTS (
            SELECT 1 FROM communication_team cteam
            WHERE cteam.communication_id = c."Id" AND cteam.user_id = ${user.Id}
          )
          OR c.owner_id = ${user.Id}
        )
      ) comms ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('Id', tu."Id", 'full_name', tu.full_name))
        AS team_members
        FROM plan_team pt
        JOIN "user" tu ON tu."Id" = pt.user_id
        WHERE pt.plan_id = p."Id"
      ) team ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('Id', ou."Id", 'full_name', ou.full_name))
        AS owners
        FROM plan_owner po
        JOIN "user" ou ON ou."Id" = po.user_id
        WHERE po.plan_id = p."Id"
      ) owner ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('Id', bas."Id", 'name', bas.name))
        AS ba_list
        FROM plan_business_area pba
        JOIN business_area bas ON bas."Id" = pba.business_area_id
        WHERE pba.plan_id = p."Id"
      ) ba ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('Id', tag."Id", 'name', tag.name))
        AS tag_list
        FROM plan_tag pt
        JOIN tag ON tag."Id" = pt.tag_id
        WHERE pt.plan_id = p."Id"
      ) tags ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('Id', sp."Id", 'name', sp.name))
        AS sp_list
        FROM plan_strategic_priority psp
        JOIN strategic_priority sp ON sp."Id" = psp.strategic_priority_id
        WHERE psp.plan_id = p."Id"
      ) sp ON true
      WHERE
        p.company_id = ${user.company_id}
        ${data.start_date && data.end_date
          ? data.show_on_grid
            ? `AND EXISTS (
                 SELECT 1 FROM communication c
                 WHERE c."Id" = ANY(comms.communication_ids)
                   AND c.start_date <= '${data.end_date}'
                   AND c.end_date >= '${data.start_date}'
               )`
            : `AND p.start_date <= '${data.end_date}'
               AND (p.end_date >= '${data.start_date}' OR p.ongoing)`
          : ""}
        ${data.show_on_grid
          ? `AND CARDINALITY(comms.communication_ids) > 0`
          : ""}
        ${data.plan_id?.length
          ? `AND p."Id" IN (${filters.plan_id})`
          : ""}
        ${data.status?.length
          ? `AND (
               p.status IN ('${filters.status}')
               OR EXISTS (
                 SELECT 1 FROM communication c
                 WHERE c."Id" = ANY(comms.communication_ids)
                   AND c.status IN ('${filters.status}')
               )
             )
             ${!data.status.includes(CommunicationStatus.Archived)
               ? "AND p.status <> 'archived'"
               : ""}`
          : ""}
        ${data.owner?.length
          ? `AND (
               EXISTS (
                 SELECT 1 FROM plan_owner po
                 WHERE po.plan_id = p."Id" AND po.user_id IN (${filters.owner})
               )
               OR EXISTS (
                 SELECT 1 FROM communication c
                 WHERE c."Id" = ANY(comms.communication_ids)
                   AND c.owner_id IN (${filters.owner})
               )
             )`
          : ""}
        ${data.business_area?.length
          ? `AND (
               EXISTS (
                 SELECT 1 FROM plan_business_area pba
                 WHERE pba.plan_id = p."Id" AND pba.business_area_id IN (${filters.business_area})
               )
               OR EXISTS (
                 SELECT 1 FROM communication_business_area cba
                 WHERE cba.communication_id = ANY(comms.communication_ids)
                   AND cba.business_area_id IN (${filters.business_area})
               )
             )`
          : ""}
        ${data.tag?.length
          ? `AND (
               EXISTS (
                 SELECT 1 FROM plan_tag pt
                 WHERE pt.plan_id = p."Id" AND pt.tag_id IN (${filters.tag})
               )
               OR EXISTS (
                 SELECT 1 FROM communication_tag
                 WHERE communication_tag.communication_id = ANY(comms.communication_ids)
                   AND communication_tag.tag_id IN (${filters.tag})
               )
             )`
          : ""}
        ${data.strategic_priority?.length
          ? `AND (
               EXISTS (
                 SELECT 1 FROM plan_strategic_priority psp
                 WHERE psp.plan_id = p."Id" AND psp.strategic_priority_id IN (${filters.strategic_priority})
               )
               OR EXISTS (
                 SELECT 1 FROM communication_strategic_priority csp
                  WHERE csp.communication_id = ANY(comms.communication_ids)
                    AND csp.strategic_priority_id IN (${filters.strategic_priority})
               )
             )`
          : ""}
        ${data.team?.length
          ? `AND (
               EXISTS (
                 SELECT 1 FROM plan_team pt
                 WHERE pt.plan_id = p."Id" AND pt.user_id IN (${filters.team})
               )
               OR EXISTS (
                 SELECT 1 FROM communication_team cteam
                  WHERE cteam.communication_id = ANY(comms.communication_ids)
                    AND cteam.user_id IN (${filters.team})
               )
             )`
          : ""}
        ${data.content_type?.length
          ? `AND EXISTS (
               SELECT 1 FROM communication_content_type cct
               WHERE cct.communication_id = ANY(comms.communication_ids)
                 AND cct.content_type_id IN (${filters.content_type})
             )`
          : ""}
        ${data.location?.length
          ? `AND EXISTS (
               SELECT 1 FROM communication_location cl
               WHERE cl.communication_id = ANY(comms.communication_ids)
                 AND cl.location_id IN (${filters.location})
             )`
          : ""}
        ${data.audience?.length
          ? `AND EXISTS (
               SELECT 1 FROM communication_audience ca
               WHERE ca.communication_id = ANY(comms.communication_ids)
                 AND ca.audience_id IN (${filters.audience})
             )`
          : ""}
        ${data.channel?.length
          ? `AND EXISTS (
               SELECT 1 FROM communication_channel cc
               WHERE cc.communication_id = ANY(comms.communication_ids)
                 AND cc.channel_id IN (${filters.channel})
             )`
          : ""}
        ${data.parent_folder_id?.length
          ? `AND p.parent_folder_id IN (
             SELECT pf."Id" 
             FROM parent_folder pf 
             WHERE pf."Id" IN (${filters.parent_folder_id}) OR 
               pf.parent_folder_id IN (${filters.parent_folder_id})
           )`
          : ""}
        ${user.role != UserRoles.Owner
          ? `AND (
             p.is_confidential = false
             OR EXISTS (
               SELECT 1 FROM plan_team pt
               WHERE pt.plan_id = p."Id" AND pt.user_id = ${user.Id}
             )
             OR EXISTS (
               SELECT 1 FROM plan_owner po
               WHERE po.plan_id = p."Id" AND po.user_id = ${user.Id}
             )
           )`
          : ""}
      ORDER BY
        ${data.column ? `p.${data.column}` : "p.start_date"}
        ${data.direction ?? "ASC"},
        p.title ASC
      OFFSET ${offset} LIMIT ${limit}`;

    const rows = await this.Repository.query(sql);
    const count = rows.length ? rows[0].total_count : 0;
    return [rows, count];
  }

  public async GetPlansAndComms(
    user: IRedisUserModel
  ): Promise<[Array<any>, number]> {
    let planQuery = this.Repository.createQueryBuilder("plan")
      .select([
        "plan",
        "owner.Id",
        "owner.full_name",
        "owner.image_url",
        "owner.email",
        "owner.is_deleted",
      ])
      .leftJoinAndSelect("plan.business_areas", "plan_business_areas")
      .leftJoinAndSelect("plan.tags", "plan_tags")
      .leftJoinAndSelect("plan.team", "team")
      .leftJoinAndSelect("plan.strategic_priorities", "strategic_priorities")
      .leftJoinAndSelect("plan.files", "files")
      .leftJoinAndSelect("files.file", "file")
      .leftJoinAndSelect("plan.owner", "owner")
      .leftJoinAndSelect("plan.communications", "communication")
      .leftJoinAndSelect("communication.business_areas", "business_area")
      .leftJoinAndSelect("communication.locations", "location")
      .leftJoinAndSelect("communication.audiences", "audience")
      .leftJoinAndSelect("communication.channels", "channel")
      .leftJoinAndSelect("communication.tags", "tags")
      .leftJoinAndSelect("communication.tasks", "tasks");

    planQuery.where(`plan.company_id = ${user.company_id}`);

    planQuery.orderBy("plan.title", "ASC").skip(0).take(10);

    const [plans, count] = await planQuery.getManyAndCount();

    return [plans, count];
  }

  public async GetPlansCountByDateRange(data, user: IRedisUserModel) {
    const paginationParam = GetPaginationOptions(data);

    let planQuery = this.Repository.createQueryBuilder("plan")
      .select([
        "plan",
        "plan_owner.Id",
        "plan_owner.full_name",
        "plan_owner.image_url",
        "plan_owner.email",
        "plan_owner.is_deleted",
      ])
      .leftJoinAndSelect("plan.tags", "plan_tags")
      .leftJoinAndSelect(
        "plan.strategic_priorities",
        "plan_strategic_priorities"
      )
      .leftJoinAndSelect("plan.team", "plan_team")
      .leftJoinAndSelect("plan.business_areas", "plan_business_area")
      .leftJoinAndSelect("plan.files", "files")
      .leftJoinAndSelect("files.file", "file")
      .leftJoin("plan.owner", "plan_owner")
      .leftJoin("plan.communications", "communication")
      .leftJoin("communication.team", "team")
      .leftJoin("communication.owner", "owner");

    if (data.business_area?.length) {
      planQuery.leftJoin("communication.business_areas", "business_area");
    }

    if (data.location?.length) {
      planQuery.leftJoin("communication.locations", "location");
    }

    if (data.audience?.length) {
      planQuery.leftJoin("communication.audiences", "audience");
    }

    if (data.channel?.length) {
      planQuery.leftJoin("communication.channels", "channel");
    }

    if (data.strategic_priority?.length) {
      planQuery.leftJoin(
        "communication.strategic_priorities",
        "strategic_priorities"
      );
    }

    if (data.tag?.length) {
      planQuery.leftJoin("communication.tags", "tags");
    }

    if (data.content_type?.length) {
      planQuery.leftJoin("communication.content_types", "content_type");
    }

    planQuery.where(`plan.company_id = ${user.company_id}`);

    if (data["plan_id"]) {
      planQuery.andWhere(`plan.Id IN (${data.plan_id.join(",")})`);
    }

    if (user.role != UserRoles.Owner) {
      planQuery.andWhere(`
        (
          plan.is_confidential != true
          OR (
            plan.is_confidential = true
            AND (
              "plan_team"."Id" = ${user.Id}
              OR "plan_owner"."Id" = ${user.Id}
            )
          )
        )
      `);
    }

    filterQBParams(planQuery, data, user);

    planQuery
      .orderBy("plan.title", "ASC")
      .skip(paginationParam.offset)
      .take(paginationParam.limit);

    const planCount = await planQuery.getCount();
    return planCount;
  }

  public async GetMostActivePlans(
    data,
    user: IRedisUserModel,
    paginationParam,
    subdomain: string
  ) {
    let planIdsObj = await this.Repository.query(`
			SELECT tb."Id", SUM(tb.total_count) AS total_count
			FROM (
					SELECT plan."Id", COUNT(comm."Id") AS total_count
					FROM plan AS plan
          LEFT JOIN plan_owner AS plan_owner
				    ON plan."Id" = plan_owner.plan_id
          LEFT JOIN plan_team AS plan_team
				    ON plan."Id" = plan_team.plan_id
					LEFT JOIN communication AS comm
						ON plan."Id" = comm.plan_id
          LEFT JOIN communication_team AS cteam
            ON comm."Id" = cteam.communication_id
					${
            data.location?.length
              ? `LEFT JOIN communication_location AS cloc
              ON comm."Id" = cloc.communication_id
            LEFT JOIN location AS loc
              ON cloc.location_id = loc."Id"`
              : ""
          }
          ${
            data.tag?.length
              ? `LEFT JOIN communication_tag ctag
                  ON comm."Id" = ctag.communication_id`
              : ""
          }
          ${
            data.strategic_priority?.length
              ? `LEFT JOIN communication_strategic_priority csp
              ON comm."Id" = csp.communication_id`
              : ""
          }
          ${
            data.audience?.length
              ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
              : ""
          }
          ${
            data.channel?.length
              ? `LEFT JOIN communication_channel cchannel
              ON comm."Id" = cchannel.communication_id`
              : ""
          }
          ${
            data.content_type?.length
              ? `LEFT JOIN communication_content_type ccontent_type
                ON comm."Id" = ccontent_type.communication_id`
              : ""
          }
					${
            data.business_area?.length
              ? `LEFT JOIN communication_business_area AS cba
                  ON comm."Id" = cba.communication_id
                LEFT JOIN business_area AS ba
                  ON cba."business_area_id" = ba."Id"`
              : ""
          }
					WHERE plan.company_id = ${user.company_id}
            ${
              user.role != UserRoles.Owner
                ? ` AND (
              plan.is_confidential != true
              OR (
                plan.is_confidential = true
                AND (
                  "plan_team"."user_id" = ${user.Id}
                  OR "plan_owner"."user_id" = ${user.Id}
                )
              )
            )`
                : ""
            }
						${filterRawQueryParams(data, user)}
							AND	(
								(comm."start_date" >= DATE('${data.start_date}')
								AND comm."start_date" <= DATE('${data.end_date}'))
								OR (comm."end_date" >= DATE('${data.start_date}')
								AND comm."end_date" <= DATE('${data.end_date}'))
								OR (comm."start_date" < DATE('${data.start_date}')
								AND comm."end_date" > DATE('${data.end_date}'))
							)
					GROUP BY plan."Id"
				UNION
					SELECT plan."Id", COUNT(task."Id") AS total_count
					FROM plan AS plan
          LEFT JOIN plan_owner AS plan_owner
				    ON plan."Id" = plan_owner.plan_id
          LEFT JOIN plan_team AS plan_team
				    ON plan."Id" = plan_team.plan_id
					LEFT JOIN communication AS comm
						ON plan."Id" = comm.plan_id
          LEFT JOIN communication_team AS cteam
            ON comm."Id" = cteam.communication_id
          LEFT JOIN task AS task
            ON comm."Id" = task.communication_id
					${
            data.location?.length
              ? `LEFT JOIN communication_location AS cloc
              ON comm."Id" = cloc.communication_id
            LEFT JOIN location AS loc
              ON cloc.location_id = loc."Id"`
              : ""
          }
          ${
            data.tag?.length
              ? `LEFT JOIN communication_tag ctag
                  ON comm."Id" = ctag.communication_id`
              : ""
          }
          ${
            data.strategic_priority?.length
              ? `LEFT JOIN communication_strategic_priority csp
              ON comm."Id" = csp.communication_id`
              : ""
          }
          ${
            data.audience?.length
              ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
              : ""
          }
          ${
            data.channel?.length
              ? `LEFT JOIN communication_channel cchannel
              ON comm."Id" = cchannel.communication_id`
              : ""
          }
          ${
            data.content_type?.length
              ? `LEFT JOIN communication_content_type ccontent_type
                ON comm."Id" = ccontent_type.communication_id`
              : ""
          }
					${
            data.business_area?.length
              ? `LEFT JOIN communication_business_area AS cba
                  ON comm."Id" = cba.communication_id
                LEFT JOIN business_area AS ba
                  ON cba."business_area_id" = ba."Id"`
              : ""
          }
					WHERE plan.company_id = ${user.company_id}
            ${
              user.role != UserRoles.Owner
                ? ` AND (
                plan.is_confidential != true
                OR (
                  plan.is_confidential = true
                  AND (
                    "plan_team"."user_id" = ${user.Id}
                    OR "plan_owner"."user_id" = ${user.Id}
                  )
                )
              )`
                : ""
            }
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}')
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}')
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}')
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY plan."Id"
			) AS tb
			GROUP BY 1
			ORDER BY total_count DESC
			OFFSET ${paginationParam.offset}
			LIMIT ${paginationParam.limit};
		`);

    let planIds = planIdsObj.map(({ Id }) => Id);

    const commStatuses = statusConfig.communication[subdomain] || statusConfig.communication.default;
    // Dynamically generate SUM(CASE...) clauses for all communication statuses
    const statusCountsSql = Object.keys(commStatuses)
      .map(status => `SUM(CASE WHEN comm.status = '${status}' THEN 1 ELSE 0 END) AS ${status}_communication_count`)
      .join(',\n        ');

    let communicationCount = await this.Repository.query(`
      SELECT plan."Id" AS id,
        (
          SELECT COALESCE(SUM(budget.actual), 0)
          FROM budget
          WHERE budget.plan_id = plan."Id"
        ) AS plan_budget_actual,
        COUNT(comm."Id") AS communication_count,
        ${statusCountsSql}
      FROM plan
      LEFT JOIN communication AS comm
        ON comm.plan_id = plan."Id"
      INNER JOIN communication_permission AS comm_perm
        ON comm."Id" = comm_perm.communication_id
        AND comm_perm.user_id = ${user.Id}
      WHERE plan.company_id = ${user.company_id}
        AND plan."Id" IN (${planIds.length ? planIds.join(",") : 0})
        AND (
          comm.is_confidential = false
          OR ${user.Id} IN (
            SELECT cteam.user_id FROM communication_team cteam
            WHERE cteam.communication_id = comm."Id"
          )
          OR comm.owner_id = ${user.Id}
        )
      GROUP BY plan."Id"
      ORDER BY plan.title ASC
		`);

    let plans = await this.Repository.createQueryBuilder("plan")
      .select([
        "plan.Id",
        "plan.title",
        "plan.start_date",
        "plan.ongoing",
        "plan.end_date",
        "plan.status",
        "plan.color",
        "owner.Id",
        "owner.full_name",
        "owner.image_url",
        "owner.email",
        "owner.is_deleted",
      ])
      .leftJoin("plan.tags", "plan_tags")
      .leftJoin("plan.team", "team")
      .leftJoin("plan.business_areas", "business_area")
      .leftJoin("plan.files", "files")
      .leftJoin("files.file", "file")
      .leftJoin("plan.owner", "owner")
      .where(`plan."Id" = ANY('{${planIds.length ? planIds.join(",") : 0}}')`)
      .orderBy(
        `array_position(ARRAY[${
          planIds.length ? planIds.join(",") : 0
        }]::int[], plan."Id"::int)`
      )
      .getMany();

    return [plans, communicationCount];
  }

  public async SearchPlans(data: PlanSearchRequest, user: IRedisUserModel) {
    const paginationParam = GetPaginationOptions(data);

    const plansQB = this.Repository.createQueryBuilder("plan")
      .select([
        "plan.Id",
        "plan.title",
        "plan.start_date",
        "plan.end_date",
        "plan.ongoing",
        "plan.color",
        "plan.is_confidential",
        "plan.parent_folder_id",
        "plan.show_on_calendar",
        "tag.Id",
        "tag.name",
      ])
      .innerJoin("plan.plan_permission", "pp", `pp.user_id = ${user.Id}`)
      .leftJoin("plan.team", "team")
      .leftJoin("plan.owner", "owner")
      .leftJoin("plan.tags", "tag")
      .where(`plan.company_id = ${user.company_id}`).andWhere(`
        (
          plan.is_confidential = false
          OR
          team.Id = ${user.Id}
          OR
          owner.Id = ${user.Id}
        )
      `);

    if (data.plan) {
      plansQB.andWhere("LOWER(plan.title) LIKE :plan", {
        plan: `%${data.plan.toLowerCase()}%`,
      });
    }

    if (data.status) {
      plansQB.andWhere("plan.status IN (:...status)", {
        status: data.status,
      });
    }

    const plans = await plansQB
      .orderBy("plan.title", "ASC")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return plans;
  }

  public async PlanAndCommunicationSearch(
    data: PlanAndCommunicationSearchRequest,
    user: IRedisUserModel
  ) {
    const { name, status, entity } = data;
    const paginationParam = GetPaginationOptions(data);
    const planStatusCond = status
      ? `AND p.status IN ('${status.join("','")}')`
      : "";
    const communicationStatusCond = status
      ? `AND c.status IN ('${status.join("','")}')`
      : "";

    const planQuery = `
      SELECT distinct
        p."Id",
        p.title,
        p.description,
        p.color AS plan_color,
        NULL::bigint AS plan_id,
        'plan' AS entity,
        CASE
          WHEN ts_headline('english', psv.title, tsquery) LIKE '%<b>%'
          THEN ts_headline('english', psv.title, tsquery)
          ELSE NULL
        END AS title_match,
        CASE
            WHEN ts_headline('english', psv.description, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.description, tsquery)
            ELSE NULL
        END AS description_match,
        CASE
            WHEN ts_headline('english', psv.key_messages, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.key_messages, tsquery)
            ELSE NULL
        END AS key_messages_match,
        CASE
            WHEN ts_headline('english', psv.objectives, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.objectives, tsquery)
            ELSE NULL
        END AS objectives_match,
        CASE
            WHEN ts_headline('english', psv.sp_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.sp_names, tsquery, 'HighlightAll=true')
        ELSE NULL
        END AS sp_match,
        CASE
            WHEN ts_headline('english', psv.ba_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.ba_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS ba_match,
        NULL AS channel_match,
        NULL AS location_match,
        NULL AS audience_match,
        NULL AS ct_match,
        CASE
            WHEN ts_headline('english', psv.tag_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.tag_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS tag_match,
        CASE
            WHEN ts_headline('english', psv.owner_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.owner_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END as owner_match,
        CASE
            WHEN ts_headline('english', psv.team_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.team_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS team_match,
        CASE
            WHEN ts_headline('english', psv.pf1_name, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.pf1_name, tsquery)
            ELSE NULL
        END AS folder1_match,
        CASE
            WHEN ts_headline('english', psv.pf2_name, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', psv.pf2_name, tsquery)
            ELSE NULL
        END AS folder2_match,
        ts_rank(vector, tsquery) AS "relevance"
      FROM plan_search_view AS psv
      LEFT JOIN plan p ON p."Id" = psv."Id"
      INNER JOIN plan_permission pp
        ON p."Id" = pp.plan_id AND pp.user_id = ${user.Id}
      LEFT JOIN plan_team
        ON p."Id" = plan_team.plan_id
      LEFT JOIN plan_owner
        ON p."Id" = plan_owner.plan_id,
      plainto_tsquery('english', $1) tsquery
      WHERE
        p.company_id = ${user.company_id}
        ${planStatusCond}
        AND (
          p.is_confidential != true
          OR (
            p.is_confidential = true
            AND ( plan_team.user_id = ${user.Id} OR plan_owner.user_id = ${user.Id} )
          )
        )
      AND vector @@ tsquery
    `;

    const communicationQuery = `
      SELECT distinct
        c."Id",
        c.title,
        c.description,
        p.color AS plan_color,
        c.plan_id,
        'communication' AS entity,
        CASE
          WHEN ts_headline('english', "csv".title, tsquery) LIKE '%<b>%'
          THEN ts_headline('english', "csv".title, tsquery)
          ELSE NULL
        END AS title_match,
        CASE
            WHEN ts_headline('english', "csv".description, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".description, tsquery)
            ELSE NULL
        END AS description_match,
        CASE
            WHEN ts_headline('english', "csv".key_messages, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".key_messages, tsquery)
            ELSE NULL
        END AS key_messages_match,
        CASE
            WHEN ts_headline('english', "csv".objectives, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".objectives, tsquery)
            ELSE NULL
        END AS objectives_match,
        CASE
            WHEN ts_headline('english', "csv".sp_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".sp_names, tsquery, 'HighlightAll=true')
        ELSE NULL
        END AS sp_match,
        CASE
            WHEN ts_headline('english', "csv".ba_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".ba_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS ba_match,
        CASE
            WHEN ts_headline('english', "csv".channel_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".channel_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS channel_match,
        CASE
            WHEN ts_headline('english', "csv".location_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".location_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS location_match,
        CASE
            WHEN ts_headline('english', "csv".audience_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".audience_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS audience_match,
        CASE
            WHEN ts_headline('english', "csv".ct_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".ct_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS ct_match,
        CASE
            WHEN ts_headline('english', "csv".tag_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".tag_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS tag_match,
        CASE
            WHEN ts_headline('english', "csv".owner_name, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".owner_name, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS owner_match,
        CASE
            WHEN ts_headline('english', "csv".team_names, tsquery) LIKE '%<b>%'
            THEN ts_headline('english', "csv".team_names, tsquery, 'HighlightAll=true')
            ELSE NULL
        END AS team_match,
        NULL AS folder1_match,
        NULL AS folder2_match,
        ts_rank(vector, tsquery) AS "relevance"
      FROM communication_search_view "csv"
      LEFT JOIN communication c ON c."Id" = "csv"."Id"
      INNER JOIN plan p ON p."Id" = c.plan_id
      INNER JOIN communication_permission
        ON c."Id" = communication_permission.communication_id
          AND communication_permission.user_id = ${user.Id}
      LEFT JOIN communication_team
        ON c."Id" = communication_team.communication_id,
      plainto_tsquery('english', $1) tsquery
      WHERE
      c.company_id = ${user.company_id}
      AND (
        c.is_confidential != true
        OR (
          c.is_confidential = true
          AND ( communication_team.user_id = ${user.Id} OR c.owner_id = ${user.Id} )
        )
      )
      ${communicationStatusCond}
      AND vector @@ tsquery
    `;

    const union = `
      (
        ${entity == "plan" || entity == null ? planQuery : ""}
        ${entity == null ? "UNION" : ""}
        ${entity == "communication" || entity == null ? communicationQuery : ""}
      )
    `;

    const [result, count] = await Promise.all([
      this.Repository.query(
        `
          ${union}
          ORDER BY "relevance" DESC
          OFFSET ${paginationParam.offset}
          LIMIT ${paginationParam.limit}
        `,
        [`'${name}'`]
      ),
      this.Repository.query(`SELECT count(*) from ${union} as sub`, [
        `'${name}'`,
      ]),
    ]);

    return { result, count: +count[0].count };
  }

  public async PlanColors(companyId: number) {
    const planColors = await this.Repository.query(`
      SELECT
        DISTINCT p.color
      FROM
        plan p
      WHERE
				p.company_id = ${companyId}
		`);

    const colors = planColors.map((pc) => pc.color);

    return colors;
  }

  public async FindPlanUsers(
    planId: number,
    data,
    companyId: number
  ) {
    let users = await this.Repository.query(`
			SELECT DISTINCT u."Id", u.full_name, u.email, u.image_url
			FROM plan AS plan
			LEFT JOIN plan_team AS pt
				ON plan."Id" = pt.plan_id AND plan."Id" = ${planId}
			LEFT JOIN plan_owner AS po
				ON plan."Id" = po.plan_id AND plan."Id" = ${planId}
			INNER JOIN "user" AS u
        ON u.company_id = ${companyId} AND (
          po.user_id = u."Id"
          OR pt.user_id = u."Id"
          OR u.role = '${UserRoles.Owner}'
        )
			LEFT JOIN user_business_area_permission AS ubap
				ON u."Id" = ubap.user_id
			WHERE
				u.is_deleted = 0
				AND u.company_id = ${companyId}
				${
          data.user
            ? `AND (
							LOWER(u.full_name) LIKE LOWER('%${data.user}%')
							OR LOWER(u.email) LIKE LOWER('%${data.user}%')
						)`
            : ""
        }
				${
          data.business_area
            ? `AND (
              ubap.business_area_id IN(${data.business_area.join(",")})
              OR u.role = '${UserRoles.Owner}'
              )`
            : ""
        }
				${data.roles ? `AND (u.role IN ('${data.roles.join("','")}'))` : ""}
				${
          data.business_area_permission
            ? `AND (
						(ubap.permission IN ('${data.business_area_permission.join("','")}'))
						OR u.role = '${UserRoles.Owner}'
					)`
            : ""
        }
			ORDER BY u.full_name
		`);

    return users;
  }

  public async GetGanttChartData(
    data,
    user: IRedisUserModel
  ): Promise<{ plans: Array<PlanModel>; count }> {
    let planQuery = this.Repository.createQueryBuilder("plan")
      .select([
        "plan",
        "plan_owner.Id",
        "plan_owner.full_name",
        "plan_owner.is_deleted",
        "communication",
        "owner.Id",
        "owner.full_name",
        "owner.is_deleted",
        "task_user.Id",
        "task_user.full_name",
        "task_user.is_deleted",
      ])
      .leftJoinAndSelect("plan.business_areas", "plan_business_areas")
      .leftJoin(
        "plan.plan_permission",
        "plan_permission",
        `plan_permission.user_id = ${user.Id}`
      )
      .leftJoin("plan.owner", "plan_owner")
      .leftJoinAndSelect("plan.tags", "plan_tags")
      .leftJoin("plan.team", "plan_team")
      .leftJoin("plan.strategic_priorities", "plan_strategic_priorities")
      .leftJoinAndSelect(
        "plan.communications",
        "communication",
        `(
          (
            communication."start_date" >= DATE('${data.start_date}')
            AND communication."start_date" <= DATE('${data.end_date}')
          )
          OR (
            communication."end_date" >= DATE('${data.start_date}')
            AND communication."end_date" <= DATE('${data.end_date}')
          )
          OR (
            communication."start_date" < DATE('${data.start_date}')
            AND communication."end_date" > DATE('${data.end_date}')
          )
        )`
      )
      .leftJoin(
        "communication.communication_permission",
        "communication_permission",
        `communication_permission.user_id = ${user.Id}`
      )
      .leftJoin("communication.owner", "owner")
      .leftJoinAndSelect("communication.business_areas", "business_area")
      .leftJoinAndSelect("communication.locations", "location")
      .leftJoinAndSelect("communication.audiences", "audience")
      .leftJoinAndSelect("communication.channels", "channel")
      .leftJoin("communication.team", "team")
      .leftJoin("communication.content_types", "content_type")
      .leftJoin("communication.strategic_priorities", "strategic_priorities")
      .leftJoinAndSelect("communication.tags", "tags")
      .leftJoinAndSelect(
        "communication.tasks",
        "tasks",
        `tasks.due_date >= DATE('${data.start_date}')
    	  AND tasks.due_date <= DATE('${data.end_date}')`
      )
      .leftJoin("tasks.user", "task_user")
      .where(`plan.company_id = ${user.company_id}`)
      .andWhere(`plan_permission.plan_id IS NOT NULL`).andWhere(`(
        (
          plan."start_date" >= DATE('${data.start_date}')
          AND plan."start_date" <= DATE('${data.end_date}')
        )
        OR (
          plan."end_date" >= DATE('${data.start_date}')
          AND plan."end_date" <= DATE('${data.end_date}')
        )
        OR (
          plan."start_date" < DATE('${data.start_date}')
          AND (
            plan."end_date" > DATE('${data.end_date}')
            OR plan."end_date" IS NULL
          )
        )
      )`);

    if (data["plan_id"]) {
      planQuery.andWhere(`plan.Id IN (${data.plan_id.join(",")})`);
      delete data["plan_id"];
    }

    if (data["status"]) {
      planQuery.andWhere(`
				(
					communication.status IN ('${data.status.join("','")}') OR
					plan.status IN ('${data.status.join("','")}')
				)
			`);
      delete data["status"];
    }

    if (data["owner"]) {
      planQuery.andWhere(`
				(
					communication.owner_id IN (${data.owner.join(",")}) OR
					plan_owner."Id" IN (${data.owner.join(",")})
				)
			`);
      delete data["owner"];
    }

    if (data["business_area"]) {
      planQuery.andWhere(`
				(
					business_area."Id" IN (${data.business_area.join(",")}) OR
					plan_business_areas."Id" IN (${data.business_area.join(",")})
				)
			`);
      delete data["business_area"];
    }

    if (data["tag"]) {
      planQuery.andWhere(`
				(
					communication_tags.tag_id IN (${data.tag.join(",")}) OR
					plan_tags."Id" IN (${data.tag.join(",")})
				)
			`);
      delete data["tag"];
    }

    if (data["strategic_priority"]) {
      planQuery.andWhere(`
				(
					communication_strategic_priorities.strategic_priority_id IN (${data.strategic_priority.join(
            ","
          )}) OR
					plan_strategic_priorities."Id" IN (${data.strategic_priority.join(",")})
				)
			`);
      delete data["strategic_priority"];
    }

    if (data["team"]) {
      planQuery.andWhere(`
				(
					communication_team.user_id IN (${data.team.join(",")}) OR
					plan_plan_team.user_id IN (${data.team.join(",")})
				)
			`);
      delete data["team"];
    }

    if (user.role != UserRoles.Owner) {
      planQuery.andWhere(`
        (
          plan.is_confidential != true
          OR (
            plan.is_confidential = true
            AND (
              "plan_team"."Id" = ${user.Id}
              OR "plan_owner"."Id" = ${user.Id}
            )
          )
        )
      `);
    }

    filterQBParams(planQuery, data, user);

    planQuery.orderBy("plan.start_date", "ASC");
    planQuery.addOrderBy("communication.start_date", "ASC");
    planQuery.addOrderBy("tasks.due_date", "ASC");

    const [plans, count] = await planQuery.getManyAndCount();

    return { plans, count };
  }

  public async CheckIfUserInCommunication(
    planId: number,
    userId: number,
    user: IRedisUserModel
  ) {
    const comms = await this.Repository.query(`
      SELECT DISTINCT comm."Id", comm.title
      FROM communication AS comm
      LEFT JOIN communication_team AS ct
        ON comm."Id" = ct.communication_id
      WHERE
        comm.plan_id = ${planId} AND
        comm.company_id = ${user.company_id} AND
        (
          comm.owner_id = ${userId} OR
          ct.user_id = ${userId}
        )
    `);

    return comms;
  }

  public async GetPlanOwners(planId: number) {
    let users = await this.Repository.query(`
			SELECT po."user_id" AS "Id"
			FROM plan_owner AS po
			WHERE po."plan_id" = ${planId}
    `);

    return users;
  }

  public GetPlansQb(
    filterData: GetParentFolderAndPlanRequest,
    select: string[],
    user: IRedisUserModel
  ): SelectQueryBuilder<any> {
    const paginationParam = GetPaginationOptions(filterData);
    let plansQB = this.Repository.createQueryBuilder("plan")
      .select(select)
      .leftJoin(
        "plan.plan_permission",
        "plan_permission",
        `plan_permission.user_id = ${user.Id}`
      )
      .leftJoin("plan.owner", "plan_owner")
      .leftJoin("plan.team", "plan_team")
      .leftJoin("plan.parent_folder", "parent_folder")
      .leftJoin("plan.communications", "communication");

    if (filterData["business_area"] && filterData.business_area.length) {
      plansQB.leftJoin("plan.business_areas", "plan_business_areas");
    }
    if (filterData["tag"] && filterData.tag.length) {
      plansQB.leftJoin("plan.tags", "plan_tags");
    }

    if (
      filterData["strategic_priority"] &&
      filterData.strategic_priority.length
    ) {
      plansQB.leftJoin(
        "plan.strategic_priorities",
        "plan_strategic_priorities"
      );
    }

    if (filterData["team"] && filterData.team.length) {
      plansQB.leftJoin("communication.team", "communication_team");
    }

    plansQB.where(`plan.company_id = ${user.company_id}`);

    if (filterData.start_date && filterData.end_date) {
      plansQB.andWhere(
        `(
          ("communication"."start_date" >= DATE('${filterData.start_date}')
            AND "communication"."start_date" <= DATE('${filterData.end_date}')
          )
          OR ("communication"."end_date" >= DATE('${filterData.start_date}')
            AND "communication"."end_date" <= DATE('${filterData.end_date}')
          )
          OR ("communication"."start_date" < DATE('${filterData.start_date}')
            AND "communication"."end_date" > DATE('${filterData.end_date}')
          )
        )`
      );
    }

    if (filterData["plan_id"]) {
      plansQB.andWhere(`plan.Id IN (${filterData.plan_id.join(",")})`);
      delete filterData["plan_id"];
    }

    if (filterData["parent_folder_id"] && filterData.parent_folder_id.length) {
      plansQB.andWhere(
        new Brackets((qb) => {
          qb.where(
            `plan.parent_folder_id IN (${filterData.parent_folder_id.join(
              ","
            )})`
          );
          if (filterData.page_type == ParentFolderPage.Homepage) {
            qb.orWhere(
              `parent_folder.parent_folder_id IN (${filterData.parent_folder_id.join(
                ","
              )})`
            );
          }
        })
      );

      delete filterData["parent_folder_id"];
    }

    if (filterData["status"]) {
      plansQB.andWhere(`
					plan.status IN ('${filterData.status.join("','")}')
			`);
      if (!filterData["status"].includes(PlanStatus.Archived)) {
        plansQB.andWhere(`
					plan.status <> 'archived'
				`);
      }
      delete filterData["status"];
    }

    if (filterData["owner"]) {
      plansQB.andWhere(`(
					plan_owner."Id" IN (${filterData.owner.join(",")}) OR
          communication.owner_id IN (${filterData.owner.join(",")})
        )`);
      delete filterData["owner"];
    }

    if (filterData["business_area"] && filterData.business_area.length) {
      plansQB.andWhere(`
					plan_business_areas."Id" IN (${filterData.business_area.join(",")})
			`);
      delete filterData["business_area"];
    }

    if (filterData["tag"]) {
      plansQB.andWhere(`
					plan_tags."Id" IN (${filterData.tag.join(",")})
			`);
      delete filterData["tag"];
    }

    if (filterData["strategic_priority"]) {
      plansQB.andWhere(`
					plan_strategic_priorities."Id" IN (${filterData.strategic_priority.join(",")})
			`);
      delete filterData["strategic_priority"];
    }

    if (filterData["team"]) {
      plansQB.andWhere(`(
        plan_team."Id" IN (${filterData.team.join(",")}) OR
        communication_team."Id" IN (${filterData.team.join(",")})
      )`);
      delete filterData["team"];
    }

    if (user.role != UserRoles.Owner) {
      plansQB.andWhere("plan_permission.plan_id IS NOT NULL");
      plansQB.andWhere(`
        (
          plan.is_confidential != true
          OR plan.is_confidential IS NULL
          OR (
            plan.is_confidential = true
            AND (
              "plan_team"."Id" = ${user.Id}
              OR "plan_owner"."Id" = ${user.Id}
            )
          )
        )
      `);
    }

    plansQB
      .orderBy(
        filterData.column ? `plan.${filterData.column}` : "plan.start_date",
        filterData.direction ? filterData.direction : "ASC"
      )
      .skip(paginationParam.offset)
      .take(paginationParam.limit);

    return plansQB;
  }

  public async GetParentFolderPlans(
    filterData: GetParentFolderAndPlanRequest,
    user: IRedisUserModel
  ) {
    const select = [
      "plan.Id",
      "plan.title",
      "plan.start_date",
      "plan.ongoing",
      "plan.end_date",
      "plan.status",
      "plan.color",
      "plan.parent_folder_id",
      "plan.is_starred",
      "parent_folder.Id",
      "parent_folder.parent_folder_id",
      "plan_permission",
    ];

    const plansQb = this.GetPlansQb(filterData, select, user)
      .addSelect("(plan.status = 'archived')", "is_archived")
      .orderBy("is_archived", "ASC")
      .addOrderBy(
        filterData.column ? `plan.${filterData.column}` : "plan.start_date",
        filterData.direction ? filterData.direction : "ASC"
      );

    const [plans, count] = await plansQb.getManyAndCount();

    return { plans, count };
  }

  public async FindPlansForNotification({ statuses }): Promise<PlanModel[]> {
    const plans = await this.Repository.createQueryBuilder("plan")
      .innerJoinAndMapOne(
        "plan.company",
        CompanyModel,
        "company",
        'company."Id" = plan.company_id'
      )
      .where("company.notification_enabled = true")
      .andWhere(
        "plan.start_date - company.notification_before_days = CURRENT_DATE"
      )
      .andWhere("plan.status IN (:...statuses)", { statuses })
      .getMany();

    return plans;
  }

  public async GetDashboardData(
    filters: GetParentFolderAndPlanRequest,
    user: IRedisUserModel
  ) {
    const filtersCopy = DeepClone(filters);

    const planIdsQuery = this.GetPlansQb(filters, ["plan.Id"], user);

    // Don't count independent tasks when any plan filter is applied.
    delete filtersCopy.column;
    delete filtersCopy.direction;
    delete filtersCopy.page_type;
    const isFilterApplied = Object.keys(filtersCopy).some(
      (key) => filtersCopy[key] != undefined
    );

    const dashboard = await this.Repository.query(`
      WITH planIds AS (${planIdsQuery.getQuery()}),
      plan_counts AS (
        SELECT
          COUNT(*) AS total_plans,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS inprogress_plans,
          COUNT(CASE WHEN status = 'planned' THEN 1 END) AS planned_plans
        FROM plan
        WHERE plan."Id" IN (SELECT * FROM planIds)
      ), communication_counts AS (
        SELECT
          COUNT(*) AS total_communications,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS inprogress_communications,
          COUNT(CASE WHEN status = 'planned' THEN 1 END) AS planned_communications
        FROM communication
        WHERE plan_id IN (SELECT * FROM planIds)
      ), task_counts AS (
        SELECT
          COUNT(*) AS total_tasks,
          COUNT(CASE WHEN status NOT IN ('completed', 'todo') THEN 1 END) AS inprogress_tasks,
          COUNT(CASE WHEN status = 'todo' THEN 1 END) AS todo_tasks,
          COUNT(CASE
            WHEN status != 'completed' AND due_date < CURRENT_DATE then 1
          END) AS overdue_tasks
        FROM task
        WHERE
          company_id = ${user.company_id} AND
          (
            plan_id IN (SELECT * FROM planIds)
            ${
              isFilterApplied 
                ? "" 
                : "OR plan_id IS NULL" /* Include independent tasks when no plan filter is applied */ 
            }
          )
      )
      SELECT * FROM plan_counts pc, communication_counts cc, task_counts tc;
    `);

    return dashboard[0];
  }

  public async GetPlanFiles(planId: number, user: IRedisUserModel) {
    const plan = await this.Repository.createQueryBuilder("plan")
      .select(["plan.Id"])
      .leftJoinAndSelect("plan.files", "pf")
      .leftJoinAndSelect("pf.file", "plan_file")
      .where(`plan.company_id = ${user.company_id}`)
      .andWhere("plan.Id = :planId", { planId })
      .orderBy("plan_file.name")
      .getOne();

    return plan;
  }

  public GetParentFoldersIdsFromPlansQuery(
    filters: GetParentFolderAndPlanRequest,
    user: IRedisUserModel
  ) {
    const plansQb = this.GetPlansQb(
      filters,
      [
        "plan.parent_folder_id AS sub_folder_id",
        "parent_folder.parent_folder_id AS parent_folder_id",
      ],
      user
    );

    return `
      SELECT sub_folder_id AS Id
      FROM (${plansQb.getQuery()}) sub
      WHERE sub_folder_id IS NOT NULL AND sub_folder_id != 0
      UNION
      SELECT parent_folder_id AS Id
      FROM (${plansQb.getQuery()}) sub
      WHERE parent_folder_id IS NOT NULL AND parent_folder_id != 0
    `;
  }

  public async GetPlanById(
    planId: number, 
    user: IRedisUserModel,
    relations: Array<
      | "owner"
      | "team"
      | "business_areas"
      | "strategic_priorities"
      | "tags"
      | "files"
      | "plan_on_page"
      | "budgets"
      | "plan_permission"
      | "user_setting"
    >,
    signImageUrls = true
  ): Promise<PlanModel> {
    const includeOwner = relations.includes("owner");
    const includeTeam = relations.includes("team");
    const includeBusinessAreas = relations.includes("business_areas");
    const includeStrategicPriorities = relations.includes("strategic_priorities");
    const includeTags = relations.includes("tags");
    const includeFiles = relations.includes("files");
    const includePlanOnPage = relations.includes("plan_on_page");
    const includeBudgets = relations.includes("budgets");
    const includePlanPermission = relations.includes("plan_permission");
    const includeUserSetting = relations.includes("user_setting");

    const query = `
      SELECT
        ${includeOwner ? "COALESCE(owner_data.owners, '[]'::jsonb) AS owner," : ""}
        ${includeTeam ? "COALESCE(team_data.team_members, '[]'::jsonb) AS team," : ""}
        ${includeBusinessAreas ? "COALESCE(ba_data.business_areas, '[]'::jsonb) AS business_areas," : ""}
        ${includeStrategicPriorities ? "COALESCE(sp_data.strategic_priorities, '[]'::jsonb) AS strategic_priorities," : ""}
        ${includeTags ? "COALESCE(tag_data.tags, '[]'::jsonb) AS tags," : ""}
        ${includeFiles ? "COALESCE(pf_data.plan_files_list, '[]'::jsonb) AS files," : ""}
        ${includePlanOnPage ? "pop_data.plan_on_page_details AS plan_on_page," : ""}
        ${includeBudgets ? "COALESCE(budget_data.budgets_list, '[]'::jsonb) AS budgets," : ""}
        ${includePlanPermission ? "pp_data.plan_permission," : ""}
        p.*
      FROM
        "plan" p 
      ${includeOwner ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'Id', u."Id",
              'full_name', u.full_name,
              'email', u.email,
              'image_url', u.image_url,
              'is_deleted', u.is_deleted
              ${includeUserSetting ? `,'user_setting', to_jsonb(us.*)` : ""}
            )
          ) AS owners
          FROM plan_owner po_link
          JOIN "user" u ON u."Id" = po_link.user_id
          JOIN user_setting us ON us.user_id = u."Id"
          WHERE po_link.plan_id = p."Id"
      ) owner_data ON true` : ""}
      ${includeTeam ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'Id', u."Id",
              'full_name', u.full_name,
              'email', u.email,
              'image_url', u.image_url,
              'is_deleted', u.is_deleted
              ${includeUserSetting ? `,'user_setting', to_jsonb(us.*)` : ""}
            )
          ) AS team_members
          FROM plan_team pt_link
          JOIN "user" u ON u."Id" = pt_link.user_id
          JOIN user_setting us ON us.user_id = u."Id"
          WHERE pt_link.plan_id = p."Id"
      ) team_data ON true` : ""}
      ${includeBusinessAreas ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'Id', ba."Id",
              'name', ba.name,
              'parent_id', ba.parent_id
            )
          ) AS business_areas
          FROM plan_business_area pba_link
          JOIN business_area ba ON ba."Id" = pba_link.business_area_id
          WHERE pba_link.plan_id = p."Id"
      ) ba_data ON true` : ""}
      ${includeStrategicPriorities ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'Id', sp."Id",
              'name', sp.name
            )
          ) AS strategic_priorities
          FROM plan_strategic_priority psp_link
          JOIN strategic_priority sp ON sp."Id" = psp_link.strategic_priority_id
          WHERE psp_link.plan_id = p."Id"
      ) sp_data ON true` : ""}
      ${includeTags ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'Id', t."Id",
              'name', t.name
            )
          ) AS tags
          FROM plan_tag ptg_link
          JOIN tag t ON t."Id" = ptg_link.tag_id
          WHERE ptg_link.plan_id = p."Id"
      ) tag_data ON true` : ""}
      ${includeFiles ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'Id', pf."Id",
              'file', jsonb_build_object(
                'Id', f."Id",
                'name', f.name,
                'path', f.path,
                'size', f.size,
                'mime_type', f.mime_type,
                'created_at', f.created_at,
                'is_aws', f.is_aws
              )
            )
          ) AS plan_files_list
          FROM plan_files pf
          JOIN file f ON f."Id" = pf.file_id
          WHERE pf.plan_id = p."Id"
      ) pf_data ON true` : ""}
      ${includePlanOnPage ? `LEFT JOIN LATERAL (
          SELECT TO_JSONB(popm.*) AS plan_on_page_details
          FROM plan_on_page popm
          WHERE popm.plan_id = p."Id"
      ) pop_data ON true` : ""}
      ${includeBudgets ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(TO_JSONB(bm.*)) AS budgets_list
          FROM budget bm
          WHERE bm.plan_id = p."Id" AND bm.communication_id IS NULL
      ) budget_data ON true` : ""}
      ${includePlanPermission ? `LEFT JOIN LATERAL (
          SELECT jsonb_agg(TO_JSONB(pp.*)) AS plan_permission
          FROM plan_permission pp
          WHERE pp.plan_id = p."Id" AND pp.user_id = ${user.Id}
      ) pp_data ON true` : ""}
      WHERE
        p.company_id = ${user.company_id}
        AND p."Id" = ${planId}`;

    const planResponse = await this.Repository.query(query);
    if (!planResponse || !planResponse.length) {
      return null;
    }

    const plan: PlanModel = planResponse[0];

    if (signImageUrls) {
      const ownerImagePr = Promise.all(plan.owner.map(async (o) => {
        if (o.image_url) {
          let key = GetFileKey(o.image_url);
          o.image_url = await GetAWSSignedUrl(key);
        }
      }));
      const teamImagePr = Promise.all(plan.team.map(async (t) => {
        if (t.image_url) {
          let key = GetFileKey(t.image_url);
          t.image_url = await GetAWSSignedUrl(key);
        }
      }));

      await Promise.all([ownerImagePr, teamImagePr]);
    }

    plan.Id = +plan.Id;

    return plan;
  }

  public async GetNotificationRuleUsers(
    plan: PlanModel,
    user: IRedisUserModel,
  ): Promise<Array<{
    Id: number;
    email: string;
    full_name: string;
    company_id: number;
    is_deleted: number;
    entity: string;
    entity_name: string;
    user_setting: { receive_email_notification: boolean };
  }>> {

    const entity = NotificationRuleEntity.Tag;
    const entityIds = {
      [entity]: plan.tags.map((tag) => tag.Id),
    };

    if (!entityIds[entity].length) {
      return [];
    }
 
    let query = `
      SELECT 
        u."Id",
        u.email,
        u.full_name,
        u.company_id,
        u.is_deleted,
        nf.entity,
        ${entity}.name entity_name, 
        jsonb_build_object(               -- creates object like { receive_email_notification: true }
          'receive_email_notification', 
          us.receive_email_notification
        ) AS user_setting
      FROM plan_permission pp 
      INNER JOIN notification_rule nf 
        ON nf.user_id = pp.user_id 
        AND entity = '${entity}'
        AND nf.entity_id IN (${entityIds[entity].length ? entityIds[entity].join(","): 0})
      INNER JOIN ${entity} ON ${entity}."Id" = nf.entity_id
      INNER JOIN user_setting us ON us.user_id = pp.user_id
      INNER JOIN "user" u 
        ON u."Id" = nf.user_id 
        AND u.is_deleted = 0
        AND u.company_id = ${user.company_id}
      WHERE pp.plan_id = ${plan.Id}`;

    return await this.Repository.query(query);
  }

  public async GetNotificationRuleUsersForPlan(
    planId: number,
    user: IRedisUserModel,
  ): Promise<Array<{
    Id: number;
    email: string;
    full_name: string;
    company_id: number;
    is_deleted: number;
    entity: string;
    entity_name: string;
    user_setting: { receive_email_notification: boolean };
  }>> {
    let query = `
      SELECT 
        u."Id",
        u.email,
        u.full_name,
        u.company_id,
        u.is_deleted,
        nf.entity,
        plan.title, 
        jsonb_build_object(               -- creates object like { receive_email_notification: true }
          'receive_email_notification', 
          us.receive_email_notification
        ) AS user_setting
      FROM plan_permission pp 
      INNER JOIN notification_rule nf 
        ON nf.user_id = pp.user_id 
        AND entity = 'plan'
        AND nf.entity_id = ${planId}
      INNER JOIN plan ON plan."Id" = nf.entity_id
      INNER JOIN user_setting us ON us.user_id = pp.user_id
      INNER JOIN "user" u 
        ON u."Id" = nf.user_id
        AND u.is_deleted = 0
        AND u.company_id = ${user.company_id}
      WHERE pp.plan_id = ${planId}`;

    return await this.Repository.query(query);
  }

  public async GetAllPlansByParentFolderId(
    parentFolderId: number,
    user: IRedisUserModel
  ) {
    const plans = await this.Repository.query(`
      WITH RECURSIVE folder_hierarchy AS (
        SELECT "Id", "parent_folder_id"
        FROM parent_folder
        WHERE "Id" = ${parentFolderId} AND "company_id" = ${user.company_id}

        UNION ALL

        SELECT child."Id", child."parent_folder_id"
        FROM parent_folder child
        JOIN folder_hierarchy parent ON parent."Id" = child."parent_folder_id"
      )
      SELECT
          plan."Id",
          plan."title",
          plan."description",
          plan."status",
          plan."start_date",
          plan."end_date",
          plan."parent_folder_id"
      FROM plan
      JOIN folder_hierarchy
        ON plan."parent_folder_id" = folder_hierarchy."Id"
          AND plan.company_id = ${user.company_id};
    `);

    return plans;
  }

  public async CheckUserPermissionForPlanRaw(
    planId: number,
    user: IRedisUserModel
  ): Promise<boolean> {
    if (user.role == UserRoles.Owner) {
      return true;
    }

    const rawSql = `
      SELECT 
        EXISTS (
          SELECT 1 FROM plan_permission 
          WHERE plan_id = ${planId} AND user_id = ${user.Id}
        ) AND (
          EXISTS (
            SELECT 1 FROM plan 
            WHERE "Id" = ${planId} AND is_confidential != true
          ) OR 
          EXISTS (
            SELECT 1 FROM plan_owner 
            WHERE plan_id = ${planId} AND user_id = ${user.Id}
          ) OR
          EXISTS (
            SELECT 1 FROM plan_team 
            WHERE plan_id = ${planId} AND user_id = ${user.Id}
          )
        ) AS has_access;
    `;

    const result = await this.Repository.query(rawSql);
    return result[0].has_access;
  }

  public async GetAnalyticsProgressTracker(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {

    const filters = JoinArrays(data);
    const sql = `
    SELECT
      COUNT(DISTINCT p."Id") FILTER (
        WHERE p.status = 'planned'
          AND (p.ongoing OR p.end_date >= CURRENT_DATE)
      ) AS planned,
      COUNT(DISTINCT p."Id") FILTER (
        WHERE p.status = 'in_progress'
          AND (p.ongoing OR p.end_date >= CURRENT_DATE)
      ) AS in_progress,
      COUNT(DISTINCT p."Id") FILTER (
        WHERE p.status = 'complete'
      ) AS complete,
      COUNT(DISTINCT p."Id") FILTER (
        WHERE p.status IN ('planned','in_progress')
          AND (NOT p.ongoing AND p.end_date < CURRENT_DATE)
      ) AS overdue
    FROM plan p
    ${user.role != UserRoles.Owner
        ? `INNER JOIN plan_permission pp ON pp.plan_id = p."Id" AND pp.user_id = ${user.Id}`
        : ""
    }
    LEFT JOIN plan_owner
        ON p."Id" = plan_owner.plan_id
    LEFT JOIN plan_team
        ON p."Id" = plan_team.plan_id
    ${data.tag?.length
        ? `
        INNER JOIN plan_tag AS plan_tag
            ON p."Id" = plan_tag.plan_id 
            AND plan_tag.tag_id IN (${filters.tag})`
        : ""
    }
    ${data.strategic_priority?.length
        ? `
        INNER JOIN plan_strategic_priority AS plan_strategic_priority
            ON p."Id" = plan_strategic_priority.plan_id 
            AND plan_strategic_priority.strategic_priority_id IN (${filters.strategic_priority})`
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
        : ""}
    ${data.parent_folder_id?.length 
        ? `AND p.parent_folder_id IN (${filters.parent_folder_id})` 
        : ""}`;

    const progressTracker = await this.Repository.query(sql);
    return progressTracker[0];
  }

  public async GetPlanForRAGBUpdate(): Promise<{ Id: number; company_id: number }[]> {
    const sql = `
      SELECT p."Id", p.company_id
      FROM plan p
      INNER JOIN subscription s
        ON p.company_id = s.company_id
        AND s.features @> '{"advanced_analytics": true}'
        AND s.status IN ('active', 'trialing')
      WHERE 
        p.status NOT IN ('archived')
        AND (p.ongoing OR p.end_date >= (CURRENT_DATE - INTERVAL '6 months'))
    `;
    const plans = await this.Repository.query(sql);
    return plans;
  }

  public async BulkUpdatePlanRAGB(
    plans: Array<{ Id: number; ragb_status: RAGBStatus }>,
  ) {
    if (!plans.length) return;

    // build ($1,$2),($3,$4),… and a flat params array [1,'red',2,'blue',…]
    const valuesSql = plans
      .map((_, i) => `($${i * 2 + 1}::bigint, $${i * 2 + 2}::plan_ragb_status_enum)`)
      .join(', ');
    const params = plans.flatMap(u => [u.Id, u.ragb_status]);

    await this.Repository.query(`
      UPDATE plan AS p
      SET
        ragb_status       = v.ragb_status,
        ragb_last_updated = CURRENT_TIMESTAMP
      FROM (VALUES ${valuesSql}) AS v("Id", ragb_status)
      WHERE p."Id" = v."Id"`,
      params
    );

    return;
  }

  public async GetCompanyRAGBStatus(data: AnalyticsRequest, user: IRedisUserModel): Promise<RAGBStatus> {
    const filters = JoinArrays(data);
    const sql = `
      SELECT
        COUNT(CASE WHEN p.ragb_status = 'Red' THEN 1 END)   AS red_count,
        COUNT(CASE WHEN p.ragb_status = 'Amber' THEN 1 END) AS amber_count,
        COUNT(CASE WHEN p.ragb_status = 'Green' THEN 1 END) AS green_count,
        COUNT(CASE WHEN p.ragb_status = 'Blue' THEN 1 END)  AS blue_count
      FROM plan p
      ${data.tag?.length ? `INNER JOIN plan_tag pt ON p."Id" = pt.plan_id AND pt.tag_id IN (${filters.tag})` : ""}
      ${
        data.strategic_priority?.length 
          ? `INNER JOIN plan_strategic_priority psp ON p."Id" = psp.plan_id AND psp.strategic_priority_id IN (${filters.strategic_priority})`
          : ""
      }
      ${
        data.business_area?.length 
          ? `LEFT JOIN plan_business_area pba ON p."Id" = pba.plan_id
             LEFT JOIN business_area ba ON pba.business_area_id = ba."Id"`
          : ""
      }
      ${data.team?.length ? `INNER JOIN plan_team ptm ON p."Id" = ptm.plan_id AND ptm.user_id IN (${filters.team})` : ""}
      ${data.owner?.length ? `INNER JOIN plan_owner pom ON p."Id" = pom.plan_id AND pom.user_id IN (${filters.owner})` : ""}
      WHERE p.company_id = ${user.company_id}
        AND p.ragb_status IS NOT NULL
        AND p.status NOT IN ('${PlanStatus.Archived}', '${PlanStatus.Cancelled}')
        AND p.start_date <= DATE('${data.end_date}')
        AND (p.end_date >= DATE('${data.start_date}') OR p.ongoing)
        ${data.plan_id?.length ? `AND p."Id" IN (${filters.plan_id})` : ""}
        ${data.status?.length ? `AND p.status IN ('${filters.status}')` : ""}
        ${data.parent_folder_id?.length ? `AND p.parent_folder_id IN (${filters.parent_folder_id})` : ""}
        ${data.business_area?.length 
            ? `AND (pba.business_area_id IN (${filters.business_area}) 
              OR ba.parent_id IN (${filters.business_area}))` 
            : ""
        }`;

    const result = await this.Repository.query(sql);
    return result[0];
  }
}
