import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { StrategicPriorityModel } from "../../model/strategic_priority/StrategicPriorityModel";
import { GetStrategicPriorities, StrategicPrioritySearchRequest } from "../../../api/controller/strategic_priority/StrategicPriorityRequest";
import {
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";

export class StrategicPriorityRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(StrategicPriorityModel)
    private strategicPriorityModelRepository: Repository<StrategicPriorityModel>,
  ) {
    super([^Repository);
  }

  public async GetStrategicPriority(data: GetStrategicPriorities, companyId: number) {
    const paginationParam = GetPaginationOptions(data);
    const [strategic_priorities, count] =
      await this.Repository.createQueryBuilder("strategic_priority")
        .where(`strategic_priority.company_id = ${companyId}`)
        .andWhere(data.name ? `strategic_priority.name ILIKE :name` : "1=1", {
          name: `%${data.name}%`,
        })
        .orderBy("strategic_priority.name", data.sort || "ASC")
        .skip(paginationParam.offset)
        .take(paginationParam.limit)
        .getManyAndCount();

    return [strategic_priorities, count];
  }

  public async SearchStrategicPriority(
    data: StrategicPrioritySearchRequest,
    company_id: number
  ) {
    const paginationParam = GetPaginationOptions(data);
    const strategic_priority = await this.Repository.query(`
      SELECT 
        DISTINCT sp."Id", sp.name
      FROM 
        strategic_priority sp
      WHERE 
        LOWER(sp.name) LIKE LOWER('%${data.strategic_priority}%')
        AND sp.company_id = ${company_id}
      ORDER BY sp.name ASC
      OFFSET ${paginationParam.offset} 
      LIMIT ${paginationParam.limit};
    `);

    return strategic_priority;
  }

  public async GetMostActiveStrategicPriority(data, user: IRedisUserModel) {
    const strategic_priorities = await this.Repository.query(`
      SELECT tb."Id", tb."name", 0 AS communication_count,
				SUM(tb.communication_count) AS communication_count, SUM(tb.total_count) AS total_count
      FROM (
					SELECT sp."Id", sp."name", COUNT(DISTINCT comm."Id") AS communication_count, 
									0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
					FROM strategic_priority AS sp
					LEFT JOIN communication_strategic_priority AS csp
						ON sp."Id" = csp.strategic_priority_id
					LEFT JOIN communication_location AS cloc
						ON csp.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON csp.communication_id = comm."Id"
					LEFT JOIN plan AS plan
						ON comm.plan_id = plan."Id"
					LEFT JOIN task AS task
						ON comm."Id" = task.communication_id
					LEFT JOIN communication_team AS cteam
						ON comm."Id" = cteam.communication_id
					${
            data.tag?.length
              ? `LEFT JOIN communication_tag ctag
              ON comm."Id" = ctag.communication_id`
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
					WHERE sp.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY sp."Id", sp."name" 
				UNION
					SELECT sp."Id", sp."name", 0 AS communication_count,
							COUNT(DISTINCT task."Id") AS task_count, COUNT(DISTINCT task."Id") AS total_count
					FROM strategic_priority AS sp
					LEFT JOIN communication_strategic_priority AS csp
						ON sp."Id" = csp.strategic_priority_id
					LEFT JOIN communication_location AS cloc
						ON csp.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON csp.communication_id = comm."Id"
					LEFT JOIN plan AS plan
						ON comm.plan_id = plan."Id"
					LEFT JOIN task AS task
						ON comm."Id" = task.communication_id
					LEFT JOIN communication_team AS cteam
						ON comm."Id" = cteam.communication_id
					${
            data.tag?.length
              ? `LEFT JOIN communication_tag ctag
              ON comm."Id" = ctag.communication_id`
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
					WHERE sp.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY sp."Id", sp."name"
			) AS tb
			WHERE tb.total_count > 0
			GROUP BY tb."Id", tb."name"
      ORDER BY SUM(tb.total_count) DESC;
    `);

    return strategic_priorities;
  }

  public async GetMostActiveStrategicPriorityV2(data, user: IRedisUserModel) {
    const strategicPriorities = await this.Repository.query(`
      SELECT
          sp."Id",
          sp."name",
          COUNT(DISTINCT comm."Id")::int AS communication_count
      FROM
          strategic_priority AS sp
      LEFT JOIN communication_strategic_priority AS csp
          ON sp."Id" = csp.strategic_priority_id
      LEFT JOIN communication AS comm
          ON csp.communication_id = comm."Id"
      ${
        user.role != UserRoles.Owner
          ? `INNER JOIN communication_permission AS cp
              ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}`
          : ""
      }
      LEFT JOIN communication_team AS cteam
          ON comm."Id" = cteam.communication_id
      ${ data.parent_folder_id ? `INNER JOIN plan ON comm.plan_id = plan."Id"` : ""}
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
      WHERE
          sp.company_id = ${user.company_id}
          ${filterRawQueryParams(data, user)}
          AND comm."start_date" <= DATE('${data.end_date}')
          AND comm."end_date" >= DATE('${data.start_date}')
          AND comm."Id" IS NOT NULL
      GROUP BY
          sp."Id"
      ORDER BY
          communication_count DESC;
      `);

    return strategicPriorities;
  }

  public async GetStrategicPriorityByCommunicationId(
    communicationId: number,
    select = []
  ) {
    select.push("strategic_priority.Id");
    return await this.Repository.createQueryBuilder("strategic_priority")
      .select(select)
      .innerJoin(
        "communication_strategic_priority",
        "csp",
        `csp.strategic_priority_id = strategic_priority.Id 
          AND csp.communication_id = ${communicationId}`
      )
      .getMany();
  }
}
