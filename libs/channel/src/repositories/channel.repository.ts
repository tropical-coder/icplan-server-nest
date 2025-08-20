import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { ChannelModel } from "../../model/channel/ChannelModel";
import {
import {
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";

export class ChannelRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(ChannelModel)
    private channelModelRepository: Repository<ChannelModel>,
  ) {
    super([^Repository);
  }

  public async GetChannel(data: GetChannelRequest, user: IRedisUserModel) {
    const paginationParam = GetPaginationOptions(data);
    let channelQB = this.Repository.createQueryBuilder("channel")
      .addSelect(`channel.name COLLATE "numeric"`, "collated_name")
      .leftJoinAndSelect("channel.business_areas", "business_areas");

    if (user.role == UserRoles.ReadonlyUser) {
      channelQB.where(`business_areas."Id" IN (
				SELECT ubap.business_area_id
				FROM user_business_area_permission AS ubap
				WHERE ubap.user_id = ${user.Id}
			)`);
    } else {
      channelQB.where("1 = 1");
    }

    if (data.name) {
      channelQB.andWhere("channel.name ILIKE :name", {
        name: `%${data.name}%`,
      })
    }

    const [channels, count] = await channelQB
      .andWhere(`channel.company_id = ${user.company_id}`)
      .orderBy(`channel.is_archive`, "ASC")
      .addOrderBy(
        `collated_name`,
        data.sort ? data.sort : "ASC"
      )
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return { channels, count };
  }

  public async GetChannelByBusinessArea(
    businessAreasIds: Array<number>,
    channelIds: Array<number>,
    companyId: number
  ) {
    const channels = await this.Repository.createQueryBuilder("channel")
      .leftJoin("channel.business_areas", "business_areas")
      .where(`channel.company_id = ${companyId}`)
      .andWhere(`channel."Id" IN (${channelIds.join(",")})`)
      .andWhere(`business_areas."Id" IN (${businessAreasIds.join(",")})`)
      .orderBy(`channel.is_archive`, "ASC")
      .addOrderBy(`channel.name COLLATE "numeric"`, "ASC")
      .getMany();

    return channels;
  }

  public async SearchChannel(data: ChannelSearchRequest, companyId: number) {
    const paginationParam = GetPaginationOptions(data);
    let query = `
			SELECT *
			FROM (
				SELECT
					DISTINCT ch.*
				FROM channel ch
				INNER JOIN channel_business_area cba
					ON ch."Id" = cba.channel_id AND ch.company_id = ${companyId}
				${data.channel || data.business_areas ? " WHERE " : ""}
				${data.channel ? "LOWER(ch.name) LIKE LOWER('%" + data.channel + "%') " : ""}
				${data.channel && data.business_areas ? " AND " : ""}`;

    if (data.business_areas) {
      query += `
					cba.business_area_id IN (
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

    query += `) AS t
      ORDER BY t.is_archive ASC, t.name COLLATE "numeric" ${
        data.sort ? data.sort : "ASC"
      }
      OFFSET ${paginationParam.offset} 
      LIMIT ${paginationParam.limit};
		`;

    const channel = await this.Repository.query(query);

    return channel;
  }

  public async GetChannelCount(data, user: IRedisUserModel) {
    const channelCount = await this.Repository.query(`
			SELECT
				COUNT(DISTINCT("channel"."Id")) as "count" 
			FROM
				"channel" AS "channel" 
			LEFT JOIN communication_channel AS cchannel
				ON channel."Id" = cchannel.channel_id
			LEFT JOIN communication_location AS cloc
				ON cchannel.communication_id = cloc.communication_id
			LEFT JOIN location AS loc
        ON cloc.location_id = loc."Id"
			LEFT JOIN communication AS comm
				ON cchannel.communication_id = comm."Id"
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
          data.audience?.length
            ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
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
				channel.company_id = ${user.company_id} 
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

    return channelCount[0].count;
  }

  public async GetMostActiveChannels(data, user: IRedisUserModel) {
    const channel = await this.Repository.query(`
			SELECT tb."Id", tb."name", tb."is_archive", SUM(tb.task_count) AS task_count, 
				SUM(tb.communication_count) AS communication_count, SUM(tb.total_count) AS total_count
      FROM (
					SELECT ch."Id", ch."name", ch."is_archive", COUNT(DISTINCT comm."Id") AS communication_count, 
								0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
					FROM channel AS ch
					LEFT JOIN communication_channel AS cchannel
						ON ch."Id" = cchannel.channel_id
					LEFT JOIN communication_location AS cloc
						ON cchannel.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON cchannel.communication_id = comm."Id"
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
          data.audience?.length
            ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
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
						ch.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY ch."Id", ch."name", ch."is_archive"
				UNION
					SELECT ch."Id", ch."name", ch."is_archive", 0 AS communication_count,
							COUNT(DISTINCT task."Id") AS task_count, COUNT(DISTINCT task."Id") AS total_count
					FROM channel AS ch
					LEFT JOIN communication_channel AS cchannel
						ON ch."Id" = cchannel.channel_id
					LEFT JOIN communication_location AS cloc
						ON cchannel.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON cchannel.communication_id = comm."Id"
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
          data.audience?.length
            ? `LEFT JOIN communication_audience caudience
              ON comm."Id" = caudience.communication_id`
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
						ch.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY ch."Id", ch."name", ch."is_archive"
			) AS tb
			GROUP BY tb."Id", tb."name", tb."is_archive"
      ORDER BY SUM(tb.total_count) DESC;
		`);

    return channel;
  }

  public async GetMostActiveChannelsV2(data, user: IRedisUserModel) {
    const sql = `	SELECT
          ch."Id",
          ch."name",
          ch."is_archive",
          COUNT(DISTINCT comm."Id")::int AS communication_count
      FROM
          channel AS ch
      LEFT JOIN communication_channel AS cchannel
          ON ch."Id" = cchannel.channel_id
      LEFT JOIN communication AS comm
          ON cchannel.communication_id = comm."Id"
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
        data.audience?.length
          ? `LEFT JOIN communication_audience caudience ON comm."Id" = caudience.communication_id`
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
          ch.company_id = ${user.company_id}
          ${filterRawQueryParams(data, user)}
          AND comm."start_date" <= DATE('${data.end_date}')
          AND comm."end_date" >= DATE('${data.start_date}')
          AND comm."Id" IS NOT NULL
      GROUP BY
          ch."Id"
      ORDER BY
          communication_count DESC;`;


    const channel = await this.Repository.query(sql);

    return channel;
  }

  public GetChannelByCommunicationId(communicationId: number, select = []) {
    select.push("channel.Id");
    return this.Repository.createQueryBuilder("channel")
      .select(select)
      .innerJoin(
        "communication_channel",
        "cc",
        "cc.channel_id = channel.Id AND cc.communication_id = :communicationId",
        { communicationId }
      )
      .getMany();
  }
}
