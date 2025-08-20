import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { CommunicationModel, CommunicationSelectable } from "../../model/communication/CommunicationModel";
import {
  GetPaginationOptions,
  doApplyBusinessAreaPermission,
  filterRawQueryParams,
  filterQBParams,
  DeepClone,
  JoinArrays,
} from "../../helpers/UtilHelper";
import { CommunicationSearchRequest } from "../../../api/controller/communication/CommunicationRequest";
import { GetPlanCommunicationsRequest } from "../../../api/controller/plan/PlanRequest";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import { CompanyModel } from "../../model/company/CompanyModel";
import { SwimlaneGroupBy } from "../../../api/controller/calendar/CalendarRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { PhaseModel } from "../../model/phase/PhaseModel";
import { NotificationRuleEntity } from "../../model/notification/NotificationRuleModel";
import { GetAWSSignedUrl, GetFileKey } from "../../service/aws/MediaService";
import * as moment from "moment";
import { GetCommunicationsForPlanDashboardRequest } from "../../../api/controller/dashboard/DashboardRequest";

@Injectable()
export class CommunicationRepository extends BaseRepository<CommunicationModel> {
  constructor(
    @InjectRepository(CommunicationModel)
    private communicationModelRepository: Repository<CommunicationModel>,
  ) {
    super(communicationModelRepository);
  }

  public async SearchCommunication(
    data: CommunicationSearchRequest,
    user: IRedisUserModel
  ) {
    const paginationParam = GetPaginationOptions(data);

    const comQB = this.communicationModelRepository.createQueryBuilder("communication")
      .select([
        "communication.Id",
        "communication.title",
        "plan.Id",
        "plan.start_date",
        "plan.end_date",
        "plan.ongoing",
        "business_areas.Id",
        "business_areas.name",
        "plan_permission",
      ])
      .leftJoin("communication.business_areas", "business_areas")
      .leftJoin("communication.team", "communication_team")
      .leftJoin("communication.plan", "plan")
      .leftJoin(
        "plan.plan_permission",
        "plan_permission",
        `plan_permission.user_id = ${user.Id}`,
      )
      .where("communication.company_id = :companyId", {
        companyId: user.company_id,
      });

    if (data.plan_id) {
      comQB.andWhere("communication.plan_id = :planId", { 
        planId: data.plan_id 
      });
    }

    if (data.communication) {
      comQB.andWhere("LOWER(communication.title) LIKE :title", {
        title: `%${data.communication.toLowerCase()}%`,
      });
    }

    const [communication, count] = await comQB
      .andWhere(`
        (
          communication.is_confidential != true
          OR 
          communication_team.Id = ${user.Id} 
          OR
          communication.owner_id = ${user.Id}
        )
      `)
      .orderBy("communication.title", "ASC")
      .offset(paginationParam.offset)
      .limit(paginationParam.limit)
      .getManyAndCount();

    return { communication, count };
  }


  public async GetCalendarHeatMap(data, user: IRedisUserModel) {
    const filteredCommCTE = `
      WITH filtered_comms AS (
        SELECT c."Id"
        FROM communication c
        INNER JOIN communication_permission cp
          ON c."Id" = cp.communication_id
          AND cp.user_id = ${user.Id}
        INNER JOIN plan p
          ON c.plan_id = p."Id"
        WHERE c.company_id = ${user.company_id}
        ${user.role != UserRoles.Owner
          ? `AND (
               (c.is_confidential != TRUE AND c.show_on_calendar)
               OR EXISTS (
                 SELECT 1 FROM communication_team ct
                 WHERE ct.communication_id = c."Id"
                 AND ct.user_id = ${user.Id}
               )
               OR c.owner_id = ${user.Id}
            )`
          : ""
        }
        ${data.status?.length
          ? `AND c.status IN ('${data.status.join("','")}')`
          : ""
        }
        ${data.plan_id?.length
          ? `AND c.plan_id IN (${data.plan_id.join(",")})`
          : ""
        }
        ${data.tag?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_tag ct
              WHERE ct.communication_id = c."Id"
                AND ct.tag_id IN (${data.tag.join(",")})
            )`
          : ""
        }
        ${data.business_area?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_business_area cba
              INNER JOIN business_area ba
                ON cba.business_area_id = ba."Id"
              WHERE cba.communication_id = c."Id"
                AND (
                  cba.business_area_id IN (${data.business_area.join(",")})
                  OR ba.parent_id IN (${data.business_area.join(",")})
                )
            )`
          : ""
        }
        ${data.audience?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_audience ca
              WHERE ca.communication_id = c."Id"
                AND ca.audience_id IN (${data.audience.join(",")})
            )`
          : ""
        }
        ${data.channel?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_channel cc
              WHERE cc.communication_id = c."Id"
                AND cc.channel_id IN (${data.channel.join(",")})
            )`
          : ""
        }
        ${data.location?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_location cl
              INNER JOIN location loc
              WHERE cl.communication_id = c."Id"
                AND (
                  cl.location_id IN (${data.location.join(",")})
                  OR loc.parent_id IN (${data.location.join(",")})
                )
            )`
          : ""
        }
        ${data.content_type?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_content_type cct
              WHERE cct.communication_id = c."Id"
                AND cct.content_type_id IN (${data.content_type.join(",")})
            )`
          : ""
        }
        ${data.strategic_priority?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_strategic_priority csp
              WHERE csp.communication_id = c."Id"
                AND csp.strategic_priority_id IN (${data.strategic_priority.join(",")})
            )`
          : ""
        }
        ${data.parent_folder_id?.length
          ? `AND p.parent_folder_id IN (
              SELECT pf."Id"
              FROM parent_folder AS pf
              WHERE
                pf."Id" IN (${data.parent_folder_id.join(",")}) 
                OR pf.parent_folder_id IN (${data.parent_folder_id.join(",")})
            )` 
          : ""
        }
        ${data.owner?.length
          ? `AND c.owner_id IN (${data.owner.join(",")})`
          : ""
        }
        ${data.team?.length
          ? `AND EXISTS (
              SELECT 1 FROM communication_team ct
              WHERE ct.communication_id = c."Id"
                AND ct.user_id IN (${data.team.join(",")})
            )`
          : ""
        }
      )
    `;

    const query = `
      ${filteredCommCTE}
      SELECT
        DATE(tb.date)::TEXT   AS date,
        SUM(tb.communication_count)   AS communication_count,
        SUM(tb.task_count)            AS task_count,
        SUM(tb.social_post_count)     AS social_post_count,
        SUM(tb.total_count)           AS total_count
      FROM (
        -- COMMUNICATIONS
        SELECT
          DATE_TRUNC('day', dd) AS date,
          COUNT(comm."Id")           AS communication_count,
          0                          AS task_count,
          0                          AS social_post_count,
          COUNT(comm."Id")           AS total_count
        FROM communication AS comm
        INNER JOIN filtered_comms fc
          ON comm."Id" = fc."Id"
        RIGHT JOIN generate_series(
          '${data.start_date}'::timestamp,
          '${data.end_date}'::timestamp,
          '1 day'::interval
        ) dd
          ON dd.date >= comm.start_date
         AND dd.date <= comm.end_date
        GROUP BY 1

        UNION

        -- TASKS
        SELECT
          DATE_TRUNC('day', dd)      AS date,
          0                          AS communication_count,
          COUNT(task."Id")           AS task_count,
          0                          AS social_post_count,
          COUNT(task."Id")           AS total_count
        FROM task
        INNER JOIN filtered_comms fc
          ON task.communication_id = fc."Id"
        RIGHT JOIN generate_series(
          '${data.start_date}'::timestamp,
          '${data.end_date}'::timestamp,
          '1 day'::interval
        ) dd
          ON dd.date = task.due_date
        GROUP BY 1

        UNION

        -- SOCIAL POSTS
        SELECT
          DATE_TRUNC('day', dd)      AS date,
          0                          AS communication_count,
          0                          AS task_count,
          COUNT(sp."Id")             AS social_post_count,
          COUNT(sp."Id")             AS total_count
        FROM social_post AS sp
        INNER JOIN communication_social_posts comm_sp
          ON sp."Id" = comm_sp.social_post_id AND sp.is_deleted = 0
        INNER JOIN filtered_comms fc
          ON comm_sp.communication_id = fc."Id"
        RIGHT JOIN generate_series(
          '${data.start_date}'::timestamp,
          '${data.end_date}'::timestamp,
          '1 day'::interval
        ) dd
          ON dd.date = sp.post_date::DATE
        GROUP BY 1
      ) AS tb
      GROUP BY 1
      ORDER BY 1;
    `;

    const events = await this.communicationModelRepository.query(query);

    return events;
  }

  public async GetCommunicationHeatMapByMonth(data, user: IRedisUserModel) {
    const events = await this.communicationModelRepository.query(`
      SELECT month, year, SUM(tb.communication_count) AS communication_count,
          SUM(tb.task_count) AS task_count, SUM(tb.total_count) AS total_count
      FROM (
          SELECT to_char(dd,'MM') as month, extract(year from dd) as year,
              COUNT(DISTINCT comm."Id") AS communication_count,
              0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
          FROM communication AS comm
          INNER JOIN plan AS plan
            ON comm.plan_id = plan."Id"
          INNER JOIN communication_permission AS cp
            ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
          LEFT JOIN communication_team cteam
            ON comm."Id" = cteam.communication_id
          ${
            data.business_area?.length
              ? `LEFT JOIN communication_business_area AS cba
                    ON comm."Id" = cba.communication_id
                 LEFT JOIN business_area AS ba
                    ON cba."business_area_id" = ba."Id" `
              : ""
          }
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
          RIGHT JOIN generate_series (
            '${data.start_date}'::timestamp,
            '${data.end_date}'::timestamp,
            '1 day'::interval
          ) dd
            ON dd.date >= comm.start_date AND dd.date <= comm.end_date
              ${filterRawQueryParams(data, user)}
          GROUP BY 1, 2
        UNION
          SELECT to_char(dd,'MM') as month, extract(year from dd) as year,
              0 AS communication_count, COUNT(DISTINCT task."Id") AS task_count,
              COUNT(DISTINCT task."Id") AS total_count
          FROM communication AS comm
          INNER JOIN plan AS plan
            ON comm.plan_id = plan."Id"
          INNER JOIN communication_permission AS cp
            ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
          LEFT JOIN communication_business_area AS cba
            ON comm."Id" = cba.communication_id
          LEFT JOIN business_area AS ba
            ON cba."business_area_id" = ba."Id"
          INNER JOIN task AS task
            ON comm."Id" = task.communication_id
          LEFT JOIN communication_team cteam
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
          RIGHT JOIN generate_series (
            '${data.start_date}'::timestamp,
            '${data.end_date}'::timestamp,
            '1 day'::interval
          ) dd
            ON dd.date = task.due_date
              ${filterRawQueryParams(data, user)}
          GROUP BY 1, 2
        ) AS tb
      GROUP BY 1, 2
      ORDER BY 2, 1;
    `);

    return events;
  }

  public async GetAnalyticsHeatMapV2(data, user: IRedisUserModel) {
    const sql = `
      WITH params AS (
        SELECT
          '${data.start_date}'::timestamp AS start_date,
          '${data.end_date}'::timestamp AS end_date
      ), series AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval) AS dd
        FROM params
      ), period_list AS (
        SELECT
          CASE
            WHEN (params.end_date::date - params.start_date::date) < 15
              THEN to_char(s.dd, 'YYYY-MM-DD')
            WHEN (params.end_date::date - params.start_date::date) < 90
              THEN to_char(date_trunc('week', s.dd), 'IYYY-"W"IW')
            WHEN (params.end_date::date - params.start_date::date) < 365
              THEN to_char(s.dd, 'YYYY-MM')
            ELSE to_char(date_trunc('quarter', s.dd), 'YYYY-"Q"Q')
          END AS period,
          MIN(s.dd) AS period_start
        FROM series s
        CROSS JOIN params
        GROUP BY 1
      ),
      counts AS (
      SELECT
        CASE
          WHEN (params.end_date::date - params.start_date::date) < 15
            THEN to_char(series.dd, 'YYYY-MM-DD')
          WHEN (params.end_date::date - params.start_date::date) < 90
            THEN to_char(date_trunc('week', series.dd), 'IYYY-"W"IW')
          WHEN (params.end_date::date - params.start_date::date) < 365
            THEN to_char(series.dd, 'YYYY-MM')
          ELSE to_char(date_trunc('quarter', series.dd), 'YYYY-"Q"Q')
        END AS period,
        COUNT(DISTINCT comm."Id") AS communication_count
      FROM communication AS comm
      LEFT JOIN communication_team AS cteam
        ON comm."Id" = cteam.communication_id
      ${
        data.parent_folder_id?.length
          ? `INNER JOIN plan ON comm.plan_id = plan."Id"`
          : ""
      }
      ${
        user.role != UserRoles.Owner
          ? `INNER JOIN communication_permission AS cp
              ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}`
          : ""
      }
      ${
        data.location?.length
          ? `LEFT JOIN communication_location cloc ON comm."Id" = cloc.communication_id
            LEFT JOIN location loc ON cloc.location_id = loc."Id"`
          : ""
      }
      ${
        data.tag?.length
          ? `LEFT JOIN communication_tag ctag ON comm."Id" = ctag.communication_id`
          : ""
      }
      ${
        data.audience?.length
          ? `LEFT JOIN communication_audience caudience ON comm."Id" = caudience.communication_id`
          : ""
      }
      ${
        data.strategic_priority?.length
          ? `LEFT JOIN communication_strategic_priority csp ON comm."Id" = csp.communication_id`
          : ""
      }
      ${
        data.channel?.length
          ? `LEFT JOIN communication_channel cchannel ON comm."Id" = cchannel.communication_id`
          : ""
      }
      ${
        data.content_type?.length
          ? `LEFT JOIN communication_content_type ccontent_type ON comm."Id" = ccontent_type.communication_id`
          : ""
      }
      ${
        data.business_area?.length
          ? `LEFT JOIN communication_business_area cba ON comm."Id" = cba.communication_id
            LEFT JOIN business_area ba ON cba."business_area_id" = ba."Id"`
          : ""
      }
      RIGHT JOIN series
        ON series.dd >= comm.start_date
        AND series.dd <= comm.end_date
      CROSS JOIN params
      WHERE 1=1
        ${filterRawQueryParams(data, user)}
      GROUP BY 1
    )
    SELECT
      pl.period,
      COALESCE(c.communication_count, 0) AS communication_count
    FROM period_list pl
    LEFT JOIN counts c
      ON c.period = pl.period
    ORDER BY pl.period_start;`;

    return await this.communicationModelRepository.query(sql);
  }

  public async GetCommunicationsByDateRange(
    data,
    user: IRedisUserModel,
    select: Array<CommunicationSelectable> = [],
    loadOwnerImage: boolean = false,
  ): Promise<CommunicationModel[]> {
    const filters = JoinArrays(data);
    const query = `
    SELECT
      c."Id"::int,
      c."title",
      c."status",
      to_char(c."start_date",'YYYY-MM-DD') AS "start_date",
      to_char(c."end_date",'YYYY-MM-DD')   AS "end_date",
      c."start_time",
      c."end_time",
      c."full_day",
      c."no_set_time",
      c."description",
      c."plan_id",
      c."is_confidential",
      c."show_on_calendar",
      c."owner_id",
      c."company_id",
      ${select.includes("owner") ? `
      jsonb_build_object(
        'Id', o."Id",
        'full_name', o."full_name",
        'email', o."email",
        ${loadOwnerImage ? `'image_url', o."image_url",` : ''}
        'is_deleted', o."is_deleted"
      ) AS "owner",` : ''}
      ${select.includes("business_areas")       ? `ba.business_areas,` : ''}
      ${select.includes("tag")                  ? `tgs.tags,`              : ''}
      ${select.includes("location")             ? `loc.locations,`          : ''}
      ${select.includes("strategic_priorities") ? `sp.strategic_priorities,` : ''}
      ${select.includes("audiences")            ? `aud.audiences,`         : ''}
      ${select.includes("channels")             ? `chn.channels,`          : ''}
      ${select.includes("content_type")         ? `cty.content_types,`     : ''}
      ${data.show_on_grid                       ? `grid.communication_grid,` : ''}
      jsonb_build_object(
        'Id', p."Id",
        'title', p."title",
        'start_date', p."start_date",
        'end_date', p."end_date",
        'color', p."color",
        'ongoing', p."ongoing",
        'status', p."status",
        'is_starred', p."is_starred"
        ${select.includes("plan_owner") ? `,
        'owner', po.plan_owners` : ''}
      ) AS "plan"
    FROM "communication" c
    INNER JOIN "communication_permission" cp
      ON cp.communication_id = c."Id" AND cp.user_id = ${user.Id}
    INNER JOIN "plan" p
      ON p."Id" = c."plan_id"
      ${data.plan_id?.length ? `AND p."Id" IN (${filters.plan_id})` : ''}
    INNER JOIN "user" o
      ON o."Id" = c."owner_id"
    ${select.includes("business_areas") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('Id', ba."Id", 'name', ba.name)),
        '[]'::jsonb
      ) AS business_areas
      FROM communication_business_area cba
      JOIN business_area ba ON ba."Id" = cba.business_area_id
      WHERE cba.communication_id = c."Id"
    ) ba ON TRUE` : ''}
    ${select.includes("tag") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('Id', t."Id", 'name', t.name)),
        '[]'::jsonb
      ) AS tags
      FROM communication_tag ct
      JOIN tag t ON t."Id" = ct.tag_id
      WHERE ct.communication_id = c."Id"
    ) tgs ON TRUE` : ''}
    ${select.includes("location") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('Id', l."Id", 'name', l.name)),
        '[]'::jsonb
      ) AS locations
      FROM communication_location cl
      JOIN location l ON l."Id" = cl.location_id
      WHERE cl.communication_id = c."Id"
    ) loc ON TRUE` : ''}
    ${select.includes("strategic_priorities") ? `
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object('Id', sp."Id", 'name', sp.name)),
          '[]'::jsonb
        ) AS strategic_priorities
        FROM communication_strategic_priority csp
        JOIN strategic_priority sp ON sp."Id" = csp.strategic_priority_id
        WHERE csp.communication_id = c."Id"
      ) AS sp ON TRUE
    ` : ''}
    ${select.includes("audiences") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('Id', a."Id", 'name', a.name)),
        '[]'::jsonb
      ) AS audiences
      FROM communication_audience ca
      JOIN audience a ON a."Id" = ca.audience_id
      WHERE ca.communication_id = c."Id"
    ) aud ON TRUE` : ''}
    ${select.includes("channels") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('Id', ch."Id", 'name', ch.name)),
        '[]'::jsonb
      ) AS channels
      FROM communication_channel cc
      JOIN channel ch ON ch."Id" = cc.channel_id
      WHERE cc.communication_id = c."Id"
    ) chn ON TRUE` : ''}
    ${select.includes("content_type") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('Id', ct."Id", 'name', ct.name)),
        '[]'::jsonb
      ) AS content_types
      FROM communication_content_type cct
      JOIN content_type ct ON ct."Id" = cct.content_type_id
      WHERE cct.communication_id = c."Id"
    ) cty ON TRUE` : ''}
    ${data.show_on_grid ? `
    INNER JOIN LATERAL (
      SELECT json_build_object('main_activity', cg.main_activity) AS communication_grid
      FROM communication_grid cg
      WHERE cg.communication_id = c."Id" AND cg.show_on_grid = TRUE
    ) grid ON TRUE` : ''}
    ${select.includes("plan_owner") ? `
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'Id', u."Id",
            'full_name', u.full_name,
            'is_deleted', u.is_deleted
          )
        ), '[]'::jsonb
      ) AS plan_owners
      FROM plan_owner plo
      JOIN "user" u ON u."Id" = plo.user_id
      WHERE plo.plan_id = p."Id"
    ) po ON TRUE` : ''}
    LEFT JOIN LATERAL (
      SELECT EXISTS(
        SELECT 1
        FROM communication_team ct
        WHERE ct.communication_id = c."Id"
          AND ct.user_id = ${user.Id}
      ) AS is_team_member
    ) ct_member ON TRUE
    WHERE
      "c"."company_id" = ${user.company_id}
      ${
        data.is_weekly_report
        ? `AND "c"."start_date" >= '${data.start_date}'
                AND "c"."start_date" < '${data.end_date}'`
        : `AND "c"."start_date" <= '${data.end_date}'
                AND "c"."end_date" >= '${data.start_date}'`
      }
      ${data.show_on_calendar ? `
        /* Show on calendar => false
          - Only show to users who are part of Communication
          Show on calendar => true
          - Show to all users who has BA rights */
        AND (
          c.show_on_calendar = true
          OR ct_member.is_team_member = TRUE
          OR o."Id" = ${user.Id}
        )` : ''}
      ${data.status?.length ? `AND c.status IN ('${filters.status}')` : ''}
      ${data.owner?.length  ? `AND c.owner_id IN (${filters.owner})` : ''}
      ${data.business_area?.length  ? `
        AND EXISTS (
          SELECT 1 FROM communication_business_area
          WHERE communication_id = c."Id"
          AND business_area_id IN (${filters.business_area})
        )` : ''
      }
      ${data.tag?.length  ? `
        AND EXISTS (
          SELECT 1 FROM communication_tag
          WHERE communication_id = c."Id"
          AND tag_id IN (${filters.tag})
        )` : ''
      }
      ${data.strategic_priority?.length  ? `
        AND EXISTS (
          SELECT 1 FROM communication_strategic_priority
          WHERE communication_id = c."Id"
          AND strategic_priority_id IN (${filters.strategic_priority})
        )` : ''
      }
      ${data.team?.length  ? `AND EXISTS (
        SELECT user_id
        FROM communication_team
        WHERE communication_id = c."Id"
        AND user_id IN (${filters.team})
      )` : ''}
      ${data.content_type?.length ? 
        `AND EXISTS (
          SELECT content_type_id
          FROM communication_content_type
          WHERE communication_id = c."Id"
          AND content_type_id IN (${filters.content_type})
        )` : ''
      }
      ${data.location?.length ? `
        AND EXISTS (
          SELECT location_id
          FROM communication_location
          WHERE communication_id = c."Id"
          AND location_id IN (${filters.location})
        )` : ''
      }
      ${data.audience?.length ? `
        AND EXISTS (
          SELECT audience_id
          FROM communication_audience
          WHERE communication_id = c."Id"
          AND audience_id IN (${filters.audience})
        )` : ''
      }
      ${data.channel?.length ? `AND EXISTS (
        SELECT channel_id
        FROM communication_channel
        WHERE communication_id = c."Id"
        AND channel_id IN (${filters.channel})
      )` : ''}
      ${user.role != UserRoles.Owner ? ` AND (
        c.is_confidential != TRUE
        OR ct_member.is_team_member = TRUE
        OR o."Id" = ${user.Id}
      )` : ''
      }
      ${data.parent_folder_id?.length  ? `
        AND p.parent_folder_id IN (
          SELECT pf."Id"
          FROM parent_folder AS pf
          WHERE
            pf."Id" IN (${filters.parent_folder_id}) 
            OR pf.parent_folder_id IN (${filters.parent_folder_id})
        )` : ''
      }
    ORDER BY
      c."start_date" ASC,
      c."start_time" ASC,
      c."end_time" ASC,
      c."title" ASC;
    `;
    let comms: CommunicationModel[] = await this.communicationModelRepository.query(query);

    if (loadOwnerImage) {
      comms = await Promise.all(
        comms.map(async (comm) => {
            if (comm.owner?.image_url) {
              comm.owner.image_url = await GetAWSSignedUrl(GetFileKey(comm.owner?.image_url));
            }
            return comm;
        })
      );
    }

    return comms;
  }

  public async GetFrequency(data, user: IRedisUserModel) {
    const events = await this.communicationModelRepository.query(`
      SELECT tb."Id", tb."name", tb.parent_id, SUM(tb.communication_count) AS communication_count,
        SUM(tb.task_count) AS task_count, SUM(tb.total_count) AS total_count
      FROM (
		    SELECT loc."Id", loc."name", loc.parent_id, COUNT(DISTINCT comm."Id") AS communication_count,
              0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
        FROM location AS loc
        LEFT JOIN location AS subloc
          ON loc."Id" = subloc.parent_id
        INNER JOIN communication_location AS cloc
          ON loc."Id" = cloc.location_id OR subloc."Id" = cloc.location_id
        INNER JOIN communication AS comm
          ON cloc.communication_id = comm."Id"
            AND	(
								(comm."start_date" >= DATE('${data.start_date}')
								AND comm."start_date" <= DATE('${data.end_date}'))
								OR (comm."end_date" >= DATE('${data.start_date}')
								AND comm."end_date" <= DATE('${data.end_date}'))
								OR (comm."start_date" < DATE('${data.start_date}')
								AND comm."end_date" > DATE('${data.end_date}'))
							)
        INNER JOIN plan AS plan
          ON comm.plan_id = plan."Id"
        INNER JOIN communication_permission AS cp
          ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
        LEFT JOIN communication_team cteam
          ON comm."Id" = cteam.communication_id
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
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
        LEFT JOIN task AS task
          ON comm."Id" = task.communication_id
        WHERE
          1 = 1
          ${filterRawQueryParams(data, user)}
        GROUP BY loc."Id", loc."name"
        UNION
        SELECT loc."Id", loc."name", loc.parent_id, 0 AS communication_count,
              COUNT(DISTINCT task."Id") AS task_count, COUNT(DISTINCT task."Id") AS total_count
        FROM location AS loc
        LEFT JOIN location AS subloc
          ON loc."Id" = subloc.parent_id
        INNER JOIN communication_location AS cloc
          ON loc."Id" = cloc.location_id OR subloc."Id" = cloc.location_id
        INNER JOIN communication AS comm
          ON cloc.communication_id = comm."Id"
            AND	(
								(comm."start_date" >= DATE('${data.start_date}')
								AND comm."start_date" <= DATE('${data.end_date}'))
								OR (comm."end_date" >= DATE('${data.start_date}')
								AND comm."end_date" <= DATE('${data.end_date}'))
								OR (comm."start_date" < DATE('${data.start_date}')
								AND comm."end_date" > DATE('${data.end_date}'))
              )
        INNER JOIN plan AS plan
          ON comm.plan_id = plan."Id"
        INNER JOIN communication_permission AS cp
          ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
        LEFT JOIN communication_team cteam
          ON comm."Id" = cteam.communication_id
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
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
        LEFT JOIN task AS task
          ON comm."Id" = task.communication_id
        WHERE
          1 = 1
          ${filterRawQueryParams(data, user)}
        GROUP BY loc."Id", loc."name"
      ) AS tb
      GROUP BY tb."Id", tb."name", tb.parent_id
      ORDER BY total_count DESC;
    `);

    return events;
  }

  public async GetCommunicationCountByDateRange(data, user: IRedisUserModel) {
    const events = await this.communicationModelRepository.query(`
      SELECT COUNT(DISTINCT comm."Id") AS communication_count
      FROM communication AS comm
      INNER JOIN plan AS plan
        ON comm.plan_id = plan."Id"
      INNER JOIN communication_permission AS cp
        ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
      LEFT JOIN communication_team cteam
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
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
      LEFT JOIN task AS task
        ON comm."Id" = task.communication_id
      WHERE
          1 = 1
          ${filterRawQueryParams(data, user)}
        AND	(
          (comm."start_date" >= DATE('${data.start_date}')
          AND comm."start_date" <= DATE('${data.end_date}'))
          OR (comm."end_date" >= DATE('${data.start_date}')
          AND comm."end_date" <= DATE('${data.end_date}'))
          OR (comm."start_date" < DATE('${data.start_date}')
          AND comm."end_date" > DATE('${data.end_date}'))
        )
    `);

    return events[0].communication_count;
  }

  public async AverageCommunicationCount(data, user: IRedisUserModel) {
    const averageCommCount = await this.communicationModelRepository.query(`
      SELECT AVG(tb.CommCount) as average
      FROM (
        SELECT COUNT(DISTINCT comm."Id") AS CommCount
        FROM communication AS comm
        INNER JOIN plan AS plan
          ON comm.plan_id = plan."Id"
        INNER JOIN communication_permission AS cp
          ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
        LEFT JOIN communication_team cteam
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
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
        LEFT JOIN task AS task
          ON comm."Id" = task.communication_id
        WHERE
          1 = 1
          ${filterRawQueryParams(data, user)}
          AND	(
            (comm."start_date" >= DATE('${data.start_date}')
            AND comm."start_date" <= DATE('${data.end_date}'))
            OR (comm."end_date" >= DATE('${data.start_date}')
            AND comm."end_date" <= DATE('${data.end_date}'))
            OR (comm."start_date" < DATE('${data.start_date}')
            AND comm."end_date" > DATE('${data.end_date}'))
          )
        GROUP BY date_trunc('month', to_timestamp(CEIL(comm.created_at/1000) ) )
      ) AS tb
    `);

    return averageCommCount[0].average;
  }

  public async GetCommunicationsAndBudgets(data, user: IRedisUserModel) {
    const communicationAndBudgets = await this.communicationModelRepository.query(`
      SELECT
        COUNT(DISTINCT comm."Id") AS live_communications,
        COALESCE(SUM(DISTINCT budget.planned), 0) AS budget_planned,
        COALESCE(SUM(DISTINCT budget.actual), 0) AS budget_actual
      FROM communication AS comm
      INNER JOIN plan AS plan
        on comm.plan_id = plan."Id"
      INNER JOIN communication_permission AS cp
        ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
      LEFT JOIN budget
        ON comm."Id" = budget.communication_id
          AND budget.company_id = ${user.company_id}
      LEFT JOIN communication_team cteam
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
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
      WHERE
          1 = 1
          ${filterRawQueryParams(data, user)}
        AND	(
          (comm."start_date" >= DATE('${data.start_date}')
          AND comm."start_date" <= DATE('${data.end_date}'))
          OR (comm."end_date" >= DATE('${data.start_date}')
          AND comm."end_date" <= DATE('${data.end_date}'))
          OR (comm."start_date" < DATE('${data.start_date}')
          AND comm."end_date" > DATE('${data.end_date}'))
        )
    `);

    return communicationAndBudgets[0];
  }

  public async GetCommunicationsLiveToday(data, user: IRedisUserModel) {
    const communicationAndBudgets = await this.communicationModelRepository.query(`
      SELECT
        COUNT(DISTINCT comm."Id") AS live_communications
      FROM communication AS comm
      INNER JOIN plan AS plan
        on comm.plan_id = plan."Id"
      INNER JOIN communication_permission AS cp
        ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}
      LEFT JOIN communication_team cteam
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
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
      WHERE
          1 = 1
          ${filterRawQueryParams(data, user)}
        AND	(
          (comm."start_date" >= NOW()
          AND comm."start_date" <= NOW())
          OR (comm."end_date" >= NOW()
          AND comm."end_date" <= NOW())
          OR (comm."start_date" < NOW()
          AND comm."end_date" > NOW())
        )
    `);

    return communicationAndBudgets[0].live_communications;
  }

    public async GetCommunicationsByPlanId(
    user: IRedisUserModel,
    planId: number,
    data: GetPlanCommunicationsRequest
  ): Promise<[Array<any>, number]> {
    const paginationParam = GetPaginationOptions(data);
    const orderByColumn = data.column ? `c.${data.column}` : "c.start_date";
    const orderByDirection = data.direction ? data.direction : "ASC";
    
    // Build search condition
    let searchCondition = "";
    if (data.name) {
      searchCondition = `
        AND (
          to_tsvector('english', c.title) || 
          to_tsvector('english', coalesce(c.description, '')) @@ 
          plainto_tsquery('english', '${data.name}')
        )`;
    }

    // Build phase condition
    let phaseCondition = "";
    if (data.phase_id > 0) {
      phaseCondition = `
        INNER JOIN phase ON phase."Id" = ${data.phase_id}
          AND c.start_date BETWEEN phase.start_date AND phase.end_date`;
    } else if (data.phase_id == 0) {
      phaseCondition = `
        LEFT JOIN phase ON c.plan_id = phase.plan_id 
          AND c.start_date BETWEEN phase.start_date AND phase.end_date`;
    }

    const query = `
      SELECT
        c."Id"::int,
        c."title",
        c."status",
        c."plan_id",
        to_char(c."start_date",'YYYY-MM-DD') AS "start_date",
        to_char(c."end_date",'YYYY-MM-DD')   AS "end_date",
        c."start_time",
        c."end_time",
        c."no_set_time",
        c."full_day",
        c."owner_id",
        c."parent_id",
        c."rrule",
        c."is_confidential",
        c."company_id",
        jsonb_build_object(
          'Id', p."Id",
          'title', p.title,
          'start_date', p.start_date,
          'ongoing', p.ongoing,
          'end_date', p.end_date,
          'status', p.status,
          'color', p.color,
          'is_starred', p.is_starred,
          'plan_permission', jsonb_build_array(to_jsonb(pp.*))
        ) as "plan",
        jsonb_build_array(to_jsonb(cp.*)) as "communication_permission",
        jsonb_build_object(
          'Id', o."Id",
          'full_name', o."full_name",
          'email', o."email",
          'image_url', o."image_url",
          'is_deleted', o."is_deleted"
        ) AS "owner",
        ba.business_areas,
        aud.audiences,
        chn.channels,
        tm.team,
        (SELECT COUNT(*)::int FROM task t WHERE t.communication_id = c."Id") as "task_count",
        COUNT(*) OVER() as total_count
      FROM "communication" c
      INNER JOIN "communication_permission" cp
        ON cp.communication_id = c."Id" AND cp.user_id = ${user.Id}
      INNER JOIN "plan" p
        ON p."Id" = c."plan_id"
      INNER JOIN "plan_permission" pp
        ON pp.plan_id = p."Id" AND pp.user_id = ${user.Id}
      INNER JOIN "user" o
        ON o."Id" = c."owner_id"
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object('Id', ba."Id", 'name', ba.name)),
          '[]'::jsonb
        ) AS business_areas
        FROM communication_business_area cba
        JOIN business_area ba ON ba."Id" = cba.business_area_id
        WHERE cba.communication_id = c."Id"
      ) ba ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object('Id', a."Id", 'name', a.name)),
          '[]'::jsonb
        ) AS audiences
        FROM communication_audience ca
        JOIN audience a ON a."Id" = ca.audience_id
        WHERE ca.communication_id = c."Id"
      ) aud ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object('Id', ch."Id", 'name', ch.name)),
          '[]'::jsonb
        ) AS channels
        FROM communication_channel cc
        JOIN channel ch ON ch."Id" = cc.channel_id
        WHERE cc.communication_id = c."Id"
      ) chn ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object('Id', u."Id", 'full_name', u.full_name, 'email', u.email, 'image_url', u.image_url, 'is_deleted', u.is_deleted)),
          '[]'::jsonb
        ) AS team
        FROM communication_team cteam
        JOIN "user" u ON u."Id" = cteam.user_id
        WHERE cteam.communication_id = c."Id"
      ) tm ON TRUE
      LEFT JOIN LATERAL (
        SELECT EXISTS (
          SELECT 1
          FROM communication_team ct
          WHERE ct.communication_id = c."Id"
            AND ct.user_id = ${user.Id}
        ) AS is_team_member
      ) ct_member ON TRUE
      ${phaseCondition}
      WHERE
        c."company_id" = ${user.company_id}
        AND p."Id" = ${planId}
        ${data.parent_id ? `AND c.parent_id = ${data.parent_id}` : ''}
        ${data.phase_id == 0 ? 'AND phase."Id" IS NULL' : ''}
        ${searchCondition}
        ${data.status?.length ? `AND c.status IN ('${data.status.join("','")}')` : ''}
        ${data.owner?.length ? `AND c.owner_id IN (${data.owner.join(',')})` : ''}
        ${data.business_area?.length ? `
          AND EXISTS (
            SELECT 1 FROM communication_business_area
            WHERE communication_id = c."Id"
            AND business_area_id IN (${data.business_area.join(',')})
          )` : ''}
        ${data.tag?.length ? `
          AND EXISTS (
            SELECT 1 FROM communication_tag
            WHERE communication_id = c."Id"
            AND tag_id IN (${data.tag.join(',')})
          )` : ''}
        ${data.strategic_priority?.length ? `
          AND EXISTS (
            SELECT 1 FROM communication_strategic_priority
            WHERE communication_id = c."Id"
            AND strategic_priority_id IN (${data.strategic_priority.join(',')})
          )` : ''}
        ${data.team?.length ? `AND EXISTS (
          SELECT user_id
          FROM communication_team
          WHERE communication_id = c."Id"
          AND user_id IN (${data.team.join(',')})
        )` : ''}
        ${data.content_type?.length ? 
          `AND EXISTS (
            SELECT content_type_id
            FROM communication_content_type
            WHERE communication_id = c."Id"
            AND content_type_id IN (${data.content_type.join(',')})
          )` : ''}
        ${data.location?.length ? `
          AND EXISTS (
            SELECT location_id
            FROM communication_location
            WHERE communication_id = c."Id"
            AND location_id IN (${data.location.join(',')})
          )` : ''}
        ${data.audience?.length ? `
          AND EXISTS (
            SELECT audience_id
            FROM communication_audience
            WHERE communication_id = c."Id"
            AND audience_id IN (${data.audience.join(',')})
          )` : ''}
        ${data.channel?.length ? `AND EXISTS (
          SELECT channel_id
          FROM communication_channel
          WHERE communication_id = c."Id"
          AND channel_id IN (${data.channel.join(',')})
        )` : ''}
        ${user.role != UserRoles.Owner ? ` AND (
          c.is_confidential != TRUE
          OR ct_member.is_team_member = TRUE
          OR o."Id" = ${user.Id}
        )` : ''}
        ${data.parent_folder_id?.length ? `
          AND p.parent_folder_id IN (
            SELECT pf."Id"
            FROM parent_folder AS pf
            WHERE
              pf."Id" IN (${data.parent_folder_id.join(',')}) 
              OR pf.parent_folder_id IN (${data.parent_folder_id.join(',')})
          )` : ''}
      ORDER BY ${orderByColumn} ${orderByDirection}
      LIMIT ${paginationParam.limit} OFFSET ${paginationParam.offset}
    `;

    const comms = await this.communicationModelRepository.query(query);
    
    const count = comms.length > 0 ? comms[0].total_count : 0;

    return [comms, count];
  }

  public async GetCommunicationsByPlanIdToDuplicate(
    user: IRedisUserModel,
    planId: number
  ): Promise<Array<CommunicationModel>> {
    const query = `
      SELECT
          c.*,
          ba.business_areas,
          tgs.tags,
          loc.locations,
          cty.content_types,
          sp.strategic_priorities,
          aud.audiences,
          chn.channels,
          tm.team,
          TO_JSONB(b) AS budget,
          cfj.files
      FROM
          "communication" c
      LEFT JOIN
          "budget" b ON b.communication_id = c."Id"
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', cba.business_area_id)), '[]'::jsonb) AS business_areas
          FROM communication_business_area cba
          WHERE cba.communication_id = c."Id" AND cba.business_area_id IS NOT NULL
      ) ba ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', ct.tag_id)), '[]'::jsonb) AS tags
          FROM communication_tag ct
          WHERE ct.communication_id = c."Id" AND ct.tag_id IS NOT NULL
      ) tgs ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', cl.location_id)), '[]'::jsonb) AS locations
          FROM communication_location cl
          WHERE cl.communication_id = c."Id" AND cl.location_id IS NOT NULL
      ) loc ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', cct.content_type_id)), '[]'::jsonb) AS content_types
          FROM communication_content_type cct
          WHERE cct.communication_id = c."Id" AND cct.content_type_id IS NOT NULL
      ) cty ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', csp.strategic_priority_id)), '[]'::jsonb) AS strategic_priorities
          FROM communication_strategic_priority csp
          WHERE csp.communication_id = c."Id" AND csp.strategic_priority_id IS NOT NULL
      ) sp ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', ca.audience_id)), '[]'::jsonb) AS audiences
          FROM communication_audience ca
          WHERE ca.communication_id = c."Id" AND ca.audience_id IS NOT NULL
      ) aud ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', cc.channel_id)), '[]'::jsonb) AS channels
          FROM communication_channel cc
          WHERE cc.communication_id = c."Id" AND cc.channel_id IS NOT NULL
      ) chn ON true
      LEFT JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('Id', cteam.user_id)), '[]'::jsonb) AS team
          FROM communication_team cteam
          WHERE cteam.communication_id = c."Id" AND cteam.user_id IS NOT NULL
      ) tm ON TRUE
		LEFT JOIN LATERAL (
		    SELECT COALESCE(jsonb_agg(TO_JSONB(f.*)), '[]'::jsonb) AS files
		    FROM "communication_files" cf
		    JOIN "file" f ON cf.file_id = f."Id"
		    WHERE cf.communication_id = c."Id"
		) cfj ON true
      WHERE
          c.company_id = ${user.company_id} 
          AND c.plan_id = ${planId}
      GROUP BY
          c."Id",
          b."Id",
          ba.business_areas,
          tgs.tags,
          loc.locations,
          cty.content_types,
          sp.strategic_priorities,
          aud.audiences,
          chn.channels,
          tm.team,
          cfj.files;`;

    return this.communicationModelRepository.query(query);
  }

  public async GetCommunicationById(
    user: IRedisUserModel,
    communicationId: number
  ): Promise<CommunicationModel> {
    const communication = await this.communicationModelRepository.createQueryBuilder(
      "communication"
    )
      .select([
        "communication",
        "plan.Id",
        "plan.title",
        "plan.start_date",
        "plan.ongoing",
        "plan.end_date",
        "plan.status",
        "plan.color",
        "plan.is_starred",
        "plan.parent_folder_id",
        "owner.Id",
        "owner.full_name",
        "owner.email",
        "owner.company_id",
        "owner.image_url",
        "owner.is_deleted",
        "us.Id",
        "us.user_id",
        "us.receive_email_notification",
        "us.status_change_notification",
        "us.assignment_notification",
        "us.start_date_notification",
        "parent.Id",
        "parent.rrule",
      ])
      .innerJoin("communication.plan", "plan")
      .leftJoinAndSelect(
        "plan.plan_permission", 
        "plan_permission", 
        `plan_permission.user_id = ${user.Id}`
      )
      .leftJoinAndSelect("communication.communication_grid", "communication_grid")
      .leftJoinAndMapOne(
        "communication.phase",
        PhaseModel,
        "phase",
        `communication.plan_id = phase.plan_id
          AND communication.start_date BETWEEN phase.start_date AND phase.end_date`
      )
      .leftJoin("communication.owner", "owner")
      .leftJoin("owner.user_setting", "us")
      .leftJoin("communication.parent", "parent")
      .leftJoinAndSelect("communication.budget", "budget")
      .where(`communication.company_id = ${user.company_id}`)
      .andWhere(`communication."Id" = :communicationId`, { communicationId })
      .getOne();

    return communication;
  }

  public async GetCommunicationTeamById(communicationId, companyId) {
    let users = await this.communicationModelRepository.query(`
			SELECT DISTINCT u."Id", u.full_name, u.email
			FROM communication AS comm
			INNER JOIN communication_team AS ct
				ON comm."Id" = ct.communication_id AND comm."Id" = ${communicationId}
			INNER JOIN "user" AS u
				ON comm.owner_id = u."Id" OR ct.user_id = u."Id"
			WHERE
				u.is_deleted = 0 AND
				u.company_id = ${companyId}
			ORDER BY u.full_name
		`);

    return users;
  }

  public async GetGanttChartCommunicationsByPlanId(
    user: IRedisUserModel,
    planId: number,
    data
  ): Promise<[Array<any>, number]> {
    const commsQuery = this.communicationModelRepository.createQueryBuilder("communication")
      .select([
        "communication",
        "owner.Id",
        "owner.full_name",
        "owner.email",
        "owner.image_url",
        "owner.is_deleted",
      ])
      .innerJoinAndSelect(
        "communication.communication_permission",
        "communication_permission",
        `communication_permission.user_id = ${user.Id}`
      )
      .innerJoinAndSelect("communication.plan", "plan")
      .leftJoinAndSelect("communication.tags", "tags")
      .leftJoinAndSelect(
        "communication.strategic_priorities",
        "strategic_priorities"
      )
      .leftJoinAndSelect("communication.team", "team")
      .leftJoinAndSelect("communication.business_areas", "business_area")
      .leftJoinAndSelect("communication.locations", "location")
      .leftJoinAndSelect("communication.audiences", "audience")
      .leftJoinAndSelect("communication.channels", "channel")
      .leftJoinAndSelect("communication.content_types", "content_type")
      .leftJoinAndSelect("communication.files", "files")
      .leftJoinAndSelect("files.file", "file")
      .leftJoin("communication.owner", "owner")
      .where(`communication.company_id = ${user.company_id}`)
      .andWhere(`plan."Id" = ${planId}`);

    commsQuery.andWhere(`(
        ("communication"."start_date" >= DATE('${data.start_date}')
          AND "communication"."start_date" <= DATE('${data.end_date}'))
        OR ("communication"."end_date" >= DATE('${data.start_date}')
          AND "communication"."end_date" <= DATE('${data.end_date}'))
        OR ("communication"."start_date" < DATE('${data.start_date}')
          AND "communication"."end_date" > DATE('${data.end_date}'))
        )`);

    filterQBParams(commsQuery, data, user);

    commsQuery.orderBy("communication.start_date");

    let [comms, count] = await commsQuery.getManyAndCount();

    return [comms, count];
  }

  public async FindCommunicationsForNotification({ statuses }) {
    const communications = await this.communicationModelRepository.createQueryBuilder(
      "communication"
    )
      .innerJoinAndMapOne(
        "communication.company",
        CompanyModel,
        "company",
        'company."Id" = communication.company_id'
      )
      .where("company.notification_enabled = true")
      .andWhere(`communication.status IN (:...statuses)`, { statuses })
      .andWhere(
        `communication.start_date - company.notification_before_days = CURRENT_DATE`
      )
      .getMany();

    return communications;
  }

  public async GetCommunicationByIdForTask(
    communicationId: number,
    companyId: number
  ) {
    const communication = await this.communicationModelRepository.createQueryBuilder(
      "communication"
    )
      .select([
        "communication.Id",
        "communication.title",
        "communication.plan_id",
        "plan.Id",
        "plan.title",
        "plan.start_date",
        "plan.ongoing",
        "plan.end_date",
        "plan.status",
        "plan.color",
        "plan.is_starred",
      ])
      .innerJoin(
        "communication.plan",
        "plan",
        `communication."Id" = ${communicationId} AND communication.plan_id = plan."Id"`
      )
      .leftJoinAndSelect("communication.business_areas", "business_area")
      .where(`communication.company_id = ${companyId}`)
      .andWhere(`communication."Id" = ${communicationId}`)
      .getOne();

    return communication;
  }

  public async GetCommunicationFilesByPlanId(
    planId: number,
    user: IRedisUserModel,
  ) {
    const communications = await this.communicationModelRepository.createQueryBuilder("communication")
      .select(["communication.Id", "communication.title"])
      .innerJoinAndSelect("communication.files", "cf")
      .innerJoinAndSelect("cf.file", "communication_file")
      .where(`communication.company_id = ${user.company_id}`)
      .andWhere("communication.plan_id = :planId", { planId })
      .orderBy("communication.title")
      .addOrderBy("communication_file.name")
      .getMany();

    return communications;
  }

  public async GetNotificationRuleUsers(
    communication: CommunicationModel,
    user: IRedisUserModel,
  ): Promise<Array<{
    Id: number;
    full_name: string;
    email: string;
    company_id: number;
    is_deleted: number;
    entity: string;
    entity_name: string;
    user_setting: { receive_email_notification: boolean };
  }>> {
    const entities = Object.values(NotificationRuleEntity)
      .filter((entity) => entity !== NotificationRuleEntity.Plan);

    const entityIds = {
      [NotificationRuleEntity.Channel]: communication.channels.map((channel) => channel.Id),
      [NotificationRuleEntity.Audience]: communication.audiences.map((audience) => audience.Id),
      [NotificationRuleEntity.StrategicPriority]: communication.strategic_priorities.map((sp) => sp.Id),
      [NotificationRuleEntity.Tag]: communication.tags.map((tag) => tag.Id),
    };
 
    let queries: string[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entityIds[entity].length) 
        continue;

      queries.push(`
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
        FROM communication_permission cp 
        INNER JOIN notification_rule nf 
          ON nf.user_id = cp.user_id 
          AND entity = '${entity}'
          AND nf.entity_id IN (${entityIds[entity].join(",")})
        INNER JOIN ${entity} ON ${entity}."Id" = nf.entity_id
        INNER JOIN user_setting us ON us.user_id = cp.user_id
        INNER JOIN "user" u 
          ON u."Id" = nf.user_id 
          AND u.is_deleted = 0
          AND u.company_id = ${user.company_id}
        WHERE cp.communication_id = ${communication.Id}
      `);
    }

    if (!queries.length) {
      return [];
    }

    const query = queries.join(" UNION ALL ");

    return await this.communicationModelRepository.query(query);
  }

  public async GetCommOverduePercentage(planId: number) {
    const result = await this.communicationModelRepository.query(`
      SELECT
          CASE
              WHEN COUNT(*) = 0 THEN 0
              ELSE (COUNT(CASE
                  WHEN c.status NOT IN ('complete', 'archived')
                  AND (
                    CASE
                      WHEN c.end_time IS NOT NULL THEN 
                        (c.end_date + c.end_time::time) < CURRENT_TIMESTAMP
                      ELSE 
                        c.end_date < CURRENT_DATE
                    END
                  ) THEN 1
                  ELSE NULL
              END) * 100.0 / COUNT(*))
          END AS overdue_percentage
      FROM communication c
      WHERE c.plan_id = $1`,
      [planId]
    );

    return +result[0].overdue_percentage;
  }

  public async GetCommunicationStatusCountGroupedByPhase(
    planId: number,
    user: IRedisUserModel,
  ) {
    const phasedCommsPr = this.communicationModelRepository.query(`
      SELECT
        p."Id" AS phase_id,
        p.title AS phase_title,
        SUM(CASE WHEN c.status = 'planned' AND c.end_date >= CURRENT_DATE THEN 1 ELSE 0 END) AS planned,
        SUM(CASE WHEN c.status = 'in_progress' AND c.end_date >= CURRENT_DATE THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN c.status = 'complete' THEN 1 ELSE 0 END) AS complete,
        SUM(CASE WHEN c.status IN ('planned', 'in_progress') AND c.end_date < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue
      FROM phase p
      LEFT JOIN communication c ON p.plan_id = c.plan_id AND c.start_date BETWEEN p.start_date AND p.end_date
      WHERE p.plan_id = $1 AND p.company_id = $2
      AND (
        ${user.role == UserRoles.Owner}
        OR c.is_confidential != TRUE
        OR EXISTS (
          SELECT user_id 
          FROM communication_team 
          WHERE communication_id = c."Id" AND user_id = ${user.Id}
        )
        OR c.owner_id = ${user.Id}
      )
      GROUP BY p."Id", p.title
      ORDER BY p.title ASC
    `, [planId, user.company_id]);

    const unphasedCommsPr = this.communicationModelRepository.query(`
      SELECT * FROM (
        SELECT
            CASE
                WHEN c.status = 'planned'     AND c.end_date >= CURRENT_DATE THEN 'planned'
                WHEN c.status = 'in_progress' AND c.end_date >= CURRENT_DATE THEN 'in_progress'
                WHEN c.status = 'complete'                                   THEN 'complete'
                WHEN c.status IN ('planned', 'in_progress')
                    AND c.end_date < CURRENT_DATE                            THEN 'overdue'
            END AS derived_status,
            COUNT(*) AS communication_count
        FROM
            communication c
        LEFT JOIN
            phase ph ON ph.plan_id = c.plan_id
                AND c.start_date BETWEEN ph.start_date AND ph.end_date
        WHERE
            c.plan_id = $1
            AND ph."Id" IS NULL
            AND c.company_id = $2
            AND (
              ${user.role == UserRoles.Owner}
              OR c.is_confidential != TRUE
              OR EXISTS (
                SELECT user_id 
                FROM communication_team 
                WHERE communication_id = c."Id" AND user_id = ${user.Id}
              )
              OR c.owner_id = ${user.Id}
            )
        GROUP BY
            derived_status
      )
      WHERE derived_status IS NOT NULL;
    `, [planId, user.company_id]);

    const [result, unphased] = await Promise.all([phasedCommsPr, unphasedCommsPr]);

    result.push({
      phase_id: null,
      phase_title: "Uncategorised",
      planned: unphased.find((item) => item.derived_status === "planned")?.communication_count || 0,
      in_progress: unphased.find((item) => item.derived_status === "in_progress")?.communication_count || 0,
      complete: unphased.find((item) => item.derived_status === "complete")?.communication_count || 0,
      overdue: unphased.find((item) => item.derived_status === "overdue")?.communication_count || 0,
    });

    return result;
  }

  public async GetCommunicationsForPlanDashboard(
    planId: number,
    data: GetCommunicationsForPlanDashboardRequest,
    user: IRedisUserModel,
  ) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const query = this.communicationModelRepository.createQueryBuilder("c")
      .select([
        "c.Id",
        "c.title",
        "c.start_date",
        "c.end_date"
      ])
      .innerJoin(
        "communication_permission",
        "cp",
        "cp.communication_id = c.Id AND cp.user_id = :userId",
        { userId: user.Id }
      )
      .where("c.company_id = :companyId", { companyId: user.company_id })
      .andWhere("c.plan_id = :planId", { planId });

    if (user.role !== UserRoles.Owner) {
      query.andWhere(`(
        c.is_confidential != TRUE
        OR EXISTS (
          SELECT user_id 
          FROM communication_team 
          WHERE communication_id = c.Id AND user_id = :userId
        )
        OR c.owner_id = :userId
      )`, { userId: user.Id });
    }

    if (data.is_uncategorized) {
      query
        .leftJoin(
          PhaseModel,
          "phase",
          `c.plan_id = phase.plan_id
           AND c.start_date BETWEEN phase.start_date AND phase.end_date`
        )
        .andWhere("phase.Id IS NULL")
        .andWhere("c.start_date <= :end", { end })
        .andWhere("c.end_date >= :start", { start });
    } else {
      query.andWhere("c.start_date BETWEEN :start AND :end", { start, end });
    }

    query.orderBy("c.start_date", "ASC")
      .addOrderBy("c.title", "ASC");

    const result = await query.getMany();
    return result;
  }
}
