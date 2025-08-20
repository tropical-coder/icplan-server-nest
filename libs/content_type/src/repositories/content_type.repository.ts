import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { ContentTypeModel } from "../../model/content_type/ContentTypeModel";
import { ContentTypeSearchRequest } from "../../../api/controller/content_type/ContentTypeRequest";
import {
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";

export class ContentTypeRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(ContentTypeModel)
    private contentTypeModelRepository: Repository<ContentTypeModel>,
  ) {
    super([^Repository);
  }

  public async GetContentTypes(data, companyId: number) {
    const paginationParam = GetPaginationOptions(data);
    const [content_types, count] = await this.Repository.createQueryBuilder(
      "content_type"
    )
      .where(`content_type.company_id = :companyId`, { companyId })
      .offset(paginationParam.offset)
      .limit(paginationParam.limit)
      .orderBy("content_type.name")
      .getManyAndCount();

    return [content_types, count];
  }

  public async SearchContentType(
    data: ContentTypeSearchRequest,
    companyId: number
  ) {
    const paginationParam = GetPaginationOptions(data);
    const content_types = await this.Repository.createQueryBuilder(
      "content_type"
    )
      .where(`content_type.company_id = :companyId`, { companyId })
      .andWhere(`LOWER(content_type.name) LIKE :search`, {
        search: `%${data.content_type.toLowerCase()}%`,
      })
      .offset(paginationParam.offset)
      .limit(paginationParam.limit)
      .orderBy("content_type.name")
      .getMany();

    return content_types;
  }

  public async GetContentTypeCount(data, user: IRedisUserModel) {
    const content_typeCount = await this.Repository.query(`
			SELECT
				COUNT(DISTINCT("content_type"."Id")) as "count" 
			FROM
				"content_type" AS "content_type" 
			LEFT JOIN communication_content_type AS ccontent_type
				ON content_type."Id" = ccontent_type.content_type_id
			LEFT JOIN communication_location AS cloc
				ON ccontent_type.communication_id = cloc.communication_id
			LEFT JOIN location AS loc
				ON cloc.location_id = loc."Id"
			LEFT JOIN communication AS comm
				ON ccontent_type.communication_id = comm."Id"
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
          data.business_area?.length
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
			WHERE
				content_type.company_id = ${user.company_id} 
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

    return content_typeCount[0].count;
  }

  public async GetMostActiveContentType(data, user: IRedisUserModel) {
    const content_type = await this.Repository.query(`
			SELECT tb."Id", tb."name", SUM(tb.task_count) AS task_count, 
				SUM(tb.communication_count) AS communication_count, SUM(tb.total_count) AS total_count
      FROM (
					SELECT content_type."Id", content_type."name", COUNT(DISTINCT comm."Id") AS communication_count, 
								0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
					FROM content_type AS content_type
					LEFT JOIN communication_content_type AS ccontent_type
						ON content_type."Id" = ccontent_type.content_type_id
					LEFT JOIN communication_location AS cloc
						ON ccontent_type.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON ccontent_type.communication_id = comm."Id"
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
          data.business_area?.length
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
        ${
          data.audience?.length
            ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
            : ""
        }
					WHERE
						content_type.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY content_type."Id", content_type."name"
				UNION
					SELECT content_type."Id", content_type."name", 0 AS communication_count,
							COUNT(DISTINCT task."Id") AS task_count, COUNT(DISTINCT task."Id") AS total_count
					FROM content_type AS content_type
					LEFT JOIN communication_content_type AS ccontent_type
						ON content_type."Id" = ccontent_type.content_type_id
					LEFT JOIN communication_location AS cloc
						ON ccontent_type.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON ccontent_type.communication_id = comm."Id"
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
          data.business_area?.length
            ? `LEFT JOIN communication_business_area cba
                ON comm."Id" = cba.communication_id
              LEFT JOIN business_area ba
                ON cba."business_area_id" = ba."Id"`
            : ""
        }
        ${
          data.audience?.length
            ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
            : ""
        }
					WHERE
						content_type.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY content_type."Id", content_type."name"
			) AS tb
			GROUP BY tb."Id", tb."name"
      ORDER BY SUM(tb.total_count) DESC;
		`);

    return content_type;
  }

  public async GetMostActiveContentTypeV2(data, user: IRedisUserModel) {
    const contentType = await this.Repository.query(`
      SELECT
          ct."Id",
          ct."name",
          COUNT(DISTINCT comm."Id")::int AS communication_count
      FROM
          content_type AS ct
      LEFT JOIN communication_content_type AS ccontent_type
          ON ct."Id" = ccontent_type.content_type_id
      LEFT JOIN communication AS comm
          ON ccontent_type.communication_id = comm."Id"
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
          ? `INNER JOIN plan ON comm.plan_id = plan."Id"`
          : ""
      }
      ${
        data.location?.length
          ? `LEFT JOIN communication_location AS cloc ON comm."Id" = cloc.communication_id
            LEFT JOIN location AS loc ON cloc.location_id = loc."Id"`
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
        data.audience?.length
          ? `LEFT JOIN communication_audience caudience ON comm."Id" = caudience.communication_id`
          : ""
      }
      ${
        data.business_area?.length
          ? `LEFT JOIN communication_business_area cba ON comm."Id" = cba.communication_id
            LEFT JOIN business_area ba ON cba."business_area_id" = ba."Id"`
          : ""
      }
      WHERE
          ct.company_id = ${user.company_id}
          ${filterRawQueryParams(data, user)}
          AND comm."start_date" <= DATE('${data.end_date}')
          AND comm."end_date" >= DATE('${data.start_date}')
          AND comm."Id" IS NOT NULL
      GROUP BY
          ct."Id"
      ORDER BY
          communication_count DESC;
        `);

    return contentType;
  }

  public async GetContentTypeByCommunicationId(communicationId: number, select = []) {
    select.push("content_type.Id");
    return await this.Repository.createQueryBuilder("content_type")
      .select(select)
      .innerJoin(
        "communication_content_type",
        "cct",
        "cct.content_type_id = content_type.Id AND cct.communication_id = :communicationId",
        { communicationId },
      )
      .getMany();
  }
}
