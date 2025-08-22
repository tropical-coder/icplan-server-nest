import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { GetPaginationOptions, filterRawQueryParams, doApplyBusinessAreaPermission } from "@app/common/helpers/misc.helper";
import { UserBusinessAreasSearchRequest } from "@app/user/dtos/user.dto";
import { IRedisUserModel, UserRoles } from "@app/user/entities/user.entity";
import { GetBusinessAreasRequest, BusinessAreaSearchRequest } from "../dtos/business_area.dto";
import { BusinessAreaModel } from "../entities/business_area.entity";

@Injectable()
export class BusinessAreaRepository extends BaseRepository<BusinessAreaModel> {
  constructor(
    @InjectRepository(BusinessAreaModel)
    private businessAreaModelRepository: Repository<BusinessAreaModel>,
  ) {
    super(businessAreaModelRepository);
  }

  public async GetBusinessAreas(
    data: GetBusinessAreasRequest,
    companyId: number
  ) {
    const paginationParam = GetPaginationOptions(data);
    const [business_areas, count] = await this.Repository.createQueryBuilder(
      "business_area"
    )
      .leftJoinAndSelect("business_area.sub_business_area", "sub_business_area")
      .leftJoinAndSelect(
        "sub_business_area.sub_business_area",
        "sub_sub_business_area"
      )
      .where(`business_area.company_id = ${companyId}`)
      .andWhere(`business_area.parent_id IS NULL`)
      .andWhere(data.name ? `business_area.name ILIKE :name` : "1=1", {
        name: `%${data.name}%`,
      })
      .orderBy("business_area.name")
      .addOrderBy("sub_business_area.name")
      .addOrderBy("sub_sub_business_area.name")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return [business_areas, count];
  }

  public async SearchBusinessArea(data: BusinessAreaSearchRequest, company_id) {
    const paginationParam = GetPaginationOptions(data);
    const business_areas = await this.Repository.createQueryBuilder(
      "business_area"
    )
      .leftJoinAndSelect("business_area.sub_business_area", "sub_business_area")
      .leftJoinAndSelect(
        "sub_business_area.sub_business_area",
        "sub_sub_business_area"
      )
      .where(
        `(
				(LOWER(business_area.name) LIKE :name 
					AND business_area.company_id = ${company_id}) 
				OR (LOWER(sub_business_area.name) LIKE :name 
					AND sub_business_area.company_id = ${company_id})
				OR (LOWER(sub_sub_business_area.name) LIKE :name 
					AND sub_sub_business_area.company_id = ${company_id})
			) AND business_area.parent_id IS NULL
      `,
        {
          name: data.business_area
            ? `%${data.business_area.toLowerCase()}%`
            : "%%",
        }
      )
      .offset(paginationParam.offset)
      .limit(paginationParam.limit)
      .orderBy("business_area.name")
      .addOrderBy("sub_business_area.name")
      .addOrderBy("sub_sub_business_area.name")
      .getMany();

    return business_areas;
  }

  public async SearchFlatBusinessArea(
    data: BusinessAreaSearchRequest,
    company_id
  ) {
    const paginationParam = GetPaginationOptions(data);
    const business_areas = await this.Repository.query(`
      SELECT 
        DISTINCT ba."Id", ba.name, ba.parent_id
      FROM 
        business_area ba
      WHERE 
        LOWER(ba.name) LIKE LOWER('%${data.business_area}%')
        AND ba.company_id = ${company_id}
      ORDER BY ba.name ASC, ba.parent_id ASC
      OFFSET ${paginationParam.offset} 
      LIMIT ${paginationParam.limit};
    `);

    return business_areas;
  }

  public async GetMostActiveBusinessAreas(data, user: IRedisUserModel) {
    const business_areas = await this.Repository.query(`
      SELECT tb."Id", tb."name", SUM(tb.task_count) AS task_count, 
				SUM(tb.communication_count) AS communication_count, SUM(tb.total_count) AS total_count
      FROM (
					SELECT ba."Id", ba."name", COUNT(DISTINCT comm."Id") AS communication_count, 
									0 AS task_count, COUNT(DISTINCT comm."Id") AS total_count
					FROM business_area AS ba
					LEFT JOIN communication_business_area AS cba
						ON ba."Id" = cba.business_area_id
					LEFT JOIN communication_location AS cloc
						ON cba.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm 
						ON cba.communication_id = comm."Id"
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
					WHERE
						ba.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY ba."Id", ba."name" 
				UNION
					SELECT ba."Id", ba."name", 0 AS communication_count,
							COUNT(DISTINCT task."Id") AS task_count, COUNT(DISTINCT task."Id") AS total_count
					FROM business_area AS ba
					LEFT JOIN communication_business_area AS cba
						ON ba."Id" = cba.business_area_id
					LEFT JOIN communication_location AS cloc
						ON cba.communication_id = cloc.communication_id
					LEFT JOIN location AS loc
        		ON cloc.location_id = loc."Id"
					LEFT JOIN communication AS comm
						ON cba.communication_id = comm."Id"
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
					WHERE ba.company_id = ${user.company_id} 
						${filterRawQueryParams(data, user)}
						AND	(
							(comm."start_date" >= DATE('${data.start_date}') 
							AND comm."start_date" <= DATE('${data.end_date}'))
							OR (comm."end_date" >= DATE('${data.start_date}') 
							AND comm."end_date" <= DATE('${data.end_date}'))
							OR (comm."start_date" < DATE('${data.start_date}') 
							AND comm."end_date" > DATE('${data.end_date}'))
						)
					GROUP BY ba."Id", ba."name"
			) AS tb
			WHERE tb.total_count > 0
			GROUP BY tb."Id", tb."name"
      ORDER BY SUM(tb.total_count) DESC;
    `);

    return business_areas;
  }

  public async DeleteBusinessArea(
    businessAreaIds: number[],
    companyId: number
  ) {
    await this.Repository.query(
      `
			WITH RECURSIVE 
				starting ("Id", "name", parent_id) AS
				(
					SELECT t."Id", t.name, t.parent_id
					FROM "business_area" AS t
					WHERE t."Id" IN ($1)
				),
				descendants ("Id", "name", parent_id) AS
				(
					SELECT t."Id", t.name, t.parent_id
					FROM starting  AS t
					UNION ALL
					SELECT t."Id", t.name, t.parent_id 
					FROM "business_area" AS t JOIN descendants AS d ON t.parent_id = d."Id"
				)
			DELETE FROM "business_area"
			WHERE "Id" IN (SELECT "Id" FROM descendants) AND company_id = $2;
		  `,
      [businessAreaIds.join(","), companyId]
    );

    return;
  }

  public async GetAllBusinessAreaLevels(businessAreas, companyId) {
    let allBusinessAreas = [];
    if (businessAreas) {
      allBusinessAreas = await this.Repository.query(`
				WITH RECURSIVE 
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "business_area" AS t
						WHERE t."Id" IN (${businessAreas.join(",")})
					),
					descendants ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM starting  AS t
						UNION ALL
						SELECT t."Id", t.name, t.parent_id 
						FROM "business_area" AS t JOIN descendants AS d ON t.parent_id = d."Id"
					),
					ancestors ("Id", name, parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id 
						FROM "business_area" AS t 
						WHERE t."Id" IN (SELECT parent_id FROM starting)
						UNION ALL
						SELECT t."Id", t.name, t.parent_id 
						FROM "business_area" AS t JOIN ancestors AS a ON t."Id" = a.parent_id
					)
				SELECT "Id" from "business_area"
				WHERE "Id" IN (
					SELECT "Id" FROM descendants
					UNION ALL
					SELECT "Id" FROM ancestors
				) AND company_id = ${companyId};
			`);
    }

    return allBusinessAreas;
  }

  public async GetUserBusinessArea(
    data: UserBusinessAreasSearchRequest,
    user: IRedisUserModel
  ) {
    const businessAreasQB = this.Repository.createQueryBuilder("business_area");

    businessAreasQB.leftJoin(
      "business_area.business_area_permission",
      "business_area_permission"
    );

    businessAreasQB
      .leftJoinAndSelect("business_area.sub_business_area", "sub_business_area")
      .leftJoinAndSelect(
        "sub_business_area.sub_business_area",
        "sub_sub_business_area"
      )
      .where(`business_area.company_id = ${user.company_id}`);

    if (data.business_area) {
      businessAreasQB.andWhere(
        `
				(
					(LOWER(business_area.name) LIKE :name 
						AND business_area.company_id = ${user.company_id}) 
					OR (LOWER(sub_business_area.name) LIKE :name 
						AND sub_business_area.company_id = ${user.company_id})
					OR (LOWER(sub_sub_business_area.name) LIKE :name 
						AND sub_sub_business_area.company_id = ${user.company_id})
				)
      `,
        { name: `%${data.business_area.toLowerCase()}%` }
      );
    }

    if (doApplyBusinessAreaPermission(user)) {
      businessAreasQB.andWhere(
        `(
					business_area_permission.user_id = ${user.Id}
				)`
      );
    } else {
      businessAreasQB.andWhere(`business_area.parent_id IS NULL`);
    }

    if (
      user.role != UserRoles.Owner &&
      data.business_area_permission &&
      data.business_area_permission.length
    ) {
      businessAreasQB.andWhere(
        `business_area_permission.permission IN (
					'${data.business_area_permission.join("','")}'
					)`
      );
    }

    const business_areas = await businessAreasQB
      .orderBy("business_area.name")
      .addOrderBy("sub_business_area.name")
      .addOrderBy("sub_sub_business_area.name")
      .getMany();

    return business_areas;
  }

  public async GetPlanBusinessAreas(
    planId: number,
    data: UserBusinessAreasSearchRequest,
    user: IRedisUserModel
  ) {
    // First get plan business areas
    const planBAsQuery = this.Repository.createQueryBuilder("plan_bas")
      .select('plan_bas."Id"')
      .innerJoin(
        "plan_business_area",
        "pba",
        `pba.plan_id = ${planId} AND pba.business_area_id = plan_bas."Id"`
      )
      .where(`plan_bas.company_id = ${user.company_id}`);

    // Get business areas with edit permissions
    const permissionQuery =
      this.Repository.createQueryBuilder("perm_bas").select('perm_bas."Id"');

    if (user.role != UserRoles.Owner) {
      permissionQuery
        .innerJoin(
          "user_business_area_permission",
          "ubap",
          `ubap.business_area_id = perm_bas."Id" AND ubap.permission = 'edit'`
        )
        .where(`perm_bas.company_id = ${user.company_id}`)
        .andWhere(`ubap.user_id = ${user.Id}`);
    } else {
      permissionQuery.where("perm_bas.parent_id IS NULL");
    }

    // Main query combining everything
    const businessAreasQB = this.Repository.createQueryBuilder("business_area")
      .leftJoinAndSelect("business_area.sub_business_area", "sub_business_area")
      .leftJoinAndSelect(
        "sub_business_area.sub_business_area",
        "sub_sub_business_area"
      )
      .leftJoin("business_area.parent", "parent_business_area")
      .where(`business_area.company_id = ${user.company_id}`)
      .andWhere(
        `(
          -- Direct match
          business_area."Id" IN (${planBAsQuery.getQuery()}) AND 
          business_area."Id" IN (${permissionQuery.getQuery()})
        ) OR (
          -- Parent has permission, children in plan
          parent_business_area."Id" IN (${permissionQuery.getQuery()}) AND
          business_area."Id" IN (${planBAsQuery.getQuery()})
        ) OR (
          -- grand parent has permission, children in plan
          parent_business_area.parent_id IN (${permissionQuery.getQuery()}) AND
          business_area."Id" IN (${planBAsQuery.getQuery()})
        ) OR (
          -- BA has permission, parent in plan
          business_area."Id" IN (${permissionQuery.getQuery()}) AND
          parent_business_area."Id" IN (${planBAsQuery.getQuery()})
        ) OR (
          -- BA has permission, grand parent in plan
          business_area."Id" IN (${permissionQuery.getQuery()}) AND
          parent_business_area.parent_id IN (${planBAsQuery.getQuery()})
        )`
      );

    if (data.business_area) {
      businessAreasQB.andWhere(
        `(
          LOWER(business_area.name) LIKE :name 
          OR LOWER(sub_business_area.name) LIKE :name
          OR LOWER(sub_sub_business_area.name) LIKE :name
        )`,
        { name: `%${data.business_area.toLowerCase()}%` }
      );
    }

    // Set parameters from subqueries
    businessAreasQB.setParameters(planBAsQuery.getParameters());
    businessAreasQB.setParameters(permissionQuery.getParameters());

    return businessAreasQB
      .orderBy("business_area.name")
      .addOrderBy("sub_business_area.name")
      .addOrderBy("sub_sub_business_area.name")
      .getMany();
  }

  public async GetAncestors(data: {
    business_areas?: number[];
    communication_id?: number;
  }) {
    let businessAreaIds: string;
    if (data.communication_id) {
      businessAreaIds = `
        SELECT business_area_id
        FROM communication_business_area
        WHERE communication_id = ${data.communication_id}
      `;
    }
    if (data.business_areas) {
      if (!data.business_areas.length) return [];

      businessAreaIds = data.business_areas.join(",");
    }
    if (!businessAreaIds) return [];

    let allBusinessAreas = await this.Repository.query(`
				WITH RECURSIVE 
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "business_area" AS t
						WHERE t."Id" IN (${businessAreaIds})
					),
					ancestors ("Id", name, parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id 
						FROM  starting as t
						UNION ALL
						SELECT t."Id", t.name, t.parent_id 
						FROM "business_area" AS t JOIN ancestors AS a ON t."Id" = a.parent_id
					)
				SELECT "Id" from "business_area"
				WHERE "Id" IN (
					SELECT "Id" FROM ancestors
				);
			`);

    return allBusinessAreas;
  }

  public async GetDecendentsByUserId(user: IRedisUserModel) {
    let businessAreaIds = await this.Repository.query(`
			WITH RECURSIVE 
				starting ("Id", "name", parent_id) AS
				(
					SELECT t."Id", t.name, t.parent_id
					FROM "business_area" AS t
					WHERE t."Id" IN (
						SELECT business_area_id
						FROM user_business_area_permission ubap
							WHERE ubap.user_id = ${user.Id}
					)
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
				) AND company_id = ${user.company_id}
			`);

    return businessAreaIds;
  }

  public async GetBusinessAreaByCommunicationId(
    communicationId: number,
    select = []
  ) {
    select.push("business_area.Id");
    return await this.Repository.createQueryBuilder("business_area")
      .select(select)
      .innerJoin(
        "communication_business_area",
        "cba",
        "cba.business_area_id = business_area.Id AND cba.communication_id = :communicationId",
        { communicationId }
      )
      .getMany();
  }
}
