import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { AudienceModel } from "../../model/audience/AudienceModel";
import { AudienceSearchRequest, GetAudienceRequest } from "../../../api/controller/audience/AudienceRequest";
import {
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";

export class AudienceRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(AudienceModel)
    private audienceModelRepository: Repository<AudienceModel>,
  ) {
    super([^Repository);
  }

  public async GetAudiences(data: GetAudienceRequest, companyId) {
    const paginationParam = GetPaginationOptions(data);
    const [audiences, count] = await this.Repository.createQueryBuilder(
      "audience"
    )
      .leftJoinAndSelect("audience.business_areas", "business_areas")
      .where(`audience.company_id = ${companyId}`)
      .andWhere(data.name ? `audience.name ILIKE :name` : "1=1", {
        name: `%${data.name}%`,
      })
      .orderBy("audience.name", data.sort || "ASC")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return [audiences, count];
  }

  public async SearchAudience(data: AudienceSearchRequest, companyId) {
    const paginationParam = GetPaginationOptions(data);
    let query = `
			SELECT
				DISTINCT aud.*
			FROM audience aud
			INNER JOIN audience_business_area aba
				ON aud."Id" = aba.audience_id AND aud.company_id = ${companyId}
			${data.audience || data.business_areas ? " WHERE " : ""}
				${data.audience ? "LOWER(aud.name) LIKE LOWER('%" + data.audience + "%') " : ""}
				${data.audience && data.business_areas ? " AND " : ""}`;

    if (data.business_areas) {
      query += `
					aba.business_area_id IN (
					WITH RECURSIVE 
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "business_area" AS t
						WHERE t."Id" IN (${data.business_areas.join(",")})
					),
					descendants ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM starting  AS t
						UNION ALL
						SELECT t."Id", t.name, t.parent_id 
						FROM "business_area" AS t JOIN descendants AS d ON t.parent_id = d."Id"
					)
					SELECT "Id" from "business_area"
					WHERE "Id" IN (
						SELECT "Id" FROM descendants
					) AND company_id = ${companyId}
				)`;
    }

    query += `ORDER BY aud.name ASC
      OFFSET ${paginationParam.offset} 
      LIMIT ${paginationParam.limit};
		`;

    const audience = await this.Repository.query(query);

    return audience;
  }

  public async GetAudienceCount(data, user: IRedisUserModel) {
    const audienceCount = await this.Repository.query(`
			SELECT
				COUNT(DISTINCT("audience"."Id")) as "count" 
			FROM
				"audience" AS "audience" 
			LEFT JOIN communication_audience AS caudience
				ON audience."Id" = caudience.audience_id
			LEFT JOIN communication_location AS cloc
				ON caudience.communication_id = cloc.communication_id
			LEFT JOIN location AS loc
        ON cloc.location_id = loc."Id"
			LEFT JOIN communication AS comm
				ON caudience.communication_id = comm."Id"
      LEFT JOIN plan AS plan
        ON comm.plan_id = plan."Id"
			LEFT JOIN communication_team AS cteam
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
				audience.company_id = ${user.company_id} 
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

    return audienceCount[0].count;
  }

  public async GetMostActiveAudience(data, user: IRedisUserModel) {
    const audience = await this.Repository.query(`
			SELECT tb."Id", tb."name", SUM(tb.task_count) AS task_count, 
				SUM(tb.communication_count) AS communication_count, SUM(tb.total_count) AS total_count
      FROM (
					SELECT aud."Id", aud."name", COUNT(DISTINCT comm."Id") AS communication_count, 
								0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
					FROM audience AS aud
					LEFT JOIN communication_audience AS caudience
						ON aud."Id" = caudience.audience_id
					LEFT JOIN communication_location AS cloc
						ON caudience.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON caudience.communication_id = comm."Id"
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
          data.strategic_priority?.length
            ? `LEFT JOIN communication_strategic_priority csp
              ON comm."Id" = csp.communication_id`
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
						aud.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY aud."Id", aud."name"
				UNION
					SELECT aud."Id", aud."name", 0 AS communication_count,
							COUNT(DISTINCT task."Id") AS task_count, COUNT(DISTINCT task."Id") AS total_count
					FROM audience AS aud
					LEFT JOIN communication_audience AS caudience
						ON aud."Id" = caudience.audience_id
					LEFT JOIN communication_location AS cloc
						ON caudience.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON caudience.communication_id = comm."Id"
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
          data.strategic_priority?.length
            ? `LEFT JOIN communication_strategic_priority csp
              ON comm."Id" = csp.communication_id`
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
						aud.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY aud."Id", aud."name"
			) AS tb
			GROUP BY tb."Id", tb."name"
      ORDER BY SUM(tb.total_count) DESC;
		`);

    return audience;
  }

  public async GetMostActiveAudienceV2(data, user: IRedisUserModel) {
    const audience = await this.Repository.query(`
      SELECT
          aud."Id",
          aud."name",
          COUNT(DISTINCT comm."Id")::int AS communication_count
      FROM
          audience AS aud
      LEFT JOIN communication_audience AS caudience
          ON aud."Id" = caudience.audience_id
      LEFT JOIN communication AS comm
          ON caudience.communication_id = comm."Id"
      ${
        user.role != UserRoles.Owner
          ? `INNER JOIN communication_permission AS cp
              ON comm."Id" = cp.communication_id AND cp.user_id = ${user.Id}`
          : ""
      }
      LEFT JOIN communication_team AS cteam
          ON comm."Id" = cteam.communication_id
      ${
        data.parent_folder_id?.length
          ? `LEFT JOIN plan ON comm.plan_id = plan."Id"`
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
      WHERE
          aud.company_id = ${user.company_id}
          ${filterRawQueryParams(data, user)}
          AND comm."start_date" <= DATE('${data.end_date}')
          AND comm."end_date" >= DATE('${data.start_date}')
          AND comm."Id" IS NOT NULL
      GROUP BY
          aud."Id"
      ORDER BY
          communication_count DESC;
    `);

    return audience;
  }

  public async GetAudienceByBusinessArea(
    businessAreasIds: Array<number>,
    audienceIds: Array<number>,
    companyId: number
  ): Promise<AudienceModel[]> {
    const audiences = await this.Repository.createQueryBuilder("audience")
      .leftJoin("audience.business_areas", "business_areas")
      .where(`audience.company_id = ${companyId}`)
      .andWhere(`audience."Id" IN (:...audienceIds)`, { audienceIds })
      .andWhere(`business_areas."Id" IN (:...businessAreasIds)`, { businessAreasIds })
      .getMany();

    return audiences;
  }

  public async GetAudienceByCommunicationId(communicationId: number, select?: Array<string>) {
    select.push("audience.Id");
    return await this.Repository.createQueryBuilder("audience")
      .select(select)
      .innerJoin(
        "communication_audience",
        "ca",
        "ca.audience_id = audience.Id AND ca.communication_id = :communicationId",
        { communicationId }
      )
      .getMany();
  }
}
