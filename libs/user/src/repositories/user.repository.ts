import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import {
  UserModel,
  IRedisUserModel,
  UserRoles,
} from "../../model/user/UserModel";
import { BaseRepository } from "@app/common/base/base.repository";
import { UserSearchRequest } from "@app/api/controller/user/UserRequest";
import { GetAllUsersRequest } from "@app/admin/controller/user/UserRequest";

@Injectable()
export class UserRepository extends BaseRepository<UserModel> {
  constructor(
    @InjectRepository(UserModel)
    private userModelRepository: Repository<UserModel>,
  ) {
    super(userModelRepository);
  }

  public async SearchUsers(data: UserSearchRequest, user: IRedisUserModel) {
    const paginationParam = GetPaginationOptions(data);

    let userListQuery = this.Repository.createQueryBuilder("user")
      .leftJoin(
        "user.business_area_permission",
        "user_business_area_permission"
      )
      .where(`user.company_id = ${user.company_id}`)
  
    if (data.is_deleted != null) {
      userListQuery.andWhere(`user.is_deleted = :isDeleted`, { isDeleted: +data.is_deleted });
    }

    if (data.user) {
      userListQuery.andWhere(
        `(
					LOWER(user.full_name) LIKE LOWER('%${data.user}%') 
					OR LOWER(user.email) LIKE LOWER('%${data.user}%')
				)`
      );
    }

    if (data.business_areas) {
      userListQuery.andWhere(
        `(
					(user_business_area_permission.business_area_id IN
						(${data.business_areas.join(",")})
					)
					OR user.role = '${UserRoles.Owner}'
				)`
      );
    }

    if (data.roles) {
      userListQuery.andWhere(`(user.role IN ('${data.roles.join("','")}'))`);
    }

    if (data.business_area_permission) {
      userListQuery.andWhere(`(
				(user_business_area_permission.permission IN (:...permissions))
				OR user.role = '${UserRoles.Owner}'
			)`, { permissions: data.business_area_permission });
    }

    let [userList, userCount] = await userListQuery
      .orderBy("user.is_deleted", "ASC") // show active users first
      .addOrderBy(
        data.column ? `user.${data.column}` : "user.full_name",
        data.direction ? data.direction : "ASC"
      )
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    const userIds = userList.map(({ Id }) => Id);

    let queryBuilder = this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.locations", "locations")
      .leftJoinAndSelect(
        "user.business_area_permission",
        "business_area_permission"
      )
      .leftJoinAndSelect(
        "business_area_permission.business_area",
        "business_area_permission_business_area"
      )
      .leftJoinAndSelect(
        "business_area_permission_business_area.sub_business_area",
        "sub_business_area"
      )
      .leftJoinAndSelect(
        "sub_business_area.sub_business_area",
        "sub_sub_business_area"
      )
      .where(`user.Id IN (${userIds.length ? userIds.join(",") : 0})`)
      .orderBy(
        data.column ? data.column : "full_name",
        data.direction ? data.direction : "ASC"
      );

    const users = await queryBuilder.getMany();

    return [users, userCount];
  }

  public async GetUserWithBARights(data, user: IRedisUserModel) {
    data.user_ids = data.user_ids.length ? data.user_ids : [0];
    let userListQuery = this.Repository.createQueryBuilder("user")
      .select([
        "user.Id",
        "user.full_name",
        "user.email",
        "user.company_id",
        "user.is_deleted",
      ])
      .leftJoin(
        "user.business_area_permission",
        "user_business_area_permission"
      )
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where(`user.company_id = ${user.company_id}`)

    if (data.is_deleted != null) {
      userListQuery.andWhere(`user.is_deleted = ${+data.is_deleted}`);
    }

    if (data.user_ids) {
      userListQuery.andWhere(`"user"."Id" IN (:...userIds)`, { userIds: data.user_ids });
    }

    if (data.business_areas) {
      userListQuery.andWhere(
        `(
          (
            user_business_area_permission.business_area_id IN
            (
              WITH RECURSIVE 
              starting ("Id", "name", parent_id) AS
              (
                SELECT t."Id", t.name, t.parent_id
                FROM "business_area" AS t
                WHERE t."Id" IN (${data.business_areas.join(",")})
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
              )
            )
          )
					OR user.role = '${UserRoles.Owner}'
        )`
      );
    }

    if (data.business_area_permission) {
      userListQuery.andWhere(`(
				(
          user_business_area_permission.permission = '${data.business_area_permission}')
				  OR "user".role = '${UserRoles.Owner}'
        )
      `);
    }

    let userList = await userListQuery.getMany();

    return userList;
  }

  public async GetAllUsers(data: GetAllUsersRequest) {
    const paginationParam = GetPaginationOptions(data);
    const count = await this.Repository.createQueryBuilder("user")
      .where(
        `1 = 1
        ${
          data.is_deleted
            ? ` AND is_deleted = ${data.is_deleted}`
            : ` AND is_deleted = 0`
        }
        ${
          data.name
            ? `AND LOWER(full_name) like '%${data.name.toLowerCase()}%'`
            : ""
        }
        ${data.company_id ? `AND company_id = '${data.company_id}'` : ""}`
      )
      .getCount();

    const users = await this.Repository.query(`
      SELECT 
        c."name",
        u."Id",
        u."company_id",
        u.full_name,
        u.email,
        u.role,
        to_timestamp(CEIL(u.last_login/1000) ) "last_login",
        u.is_mfa_enabled
      FROM company c
      LEFT JOIN "user" u
        ON c."Id" = u.company_id
      WHERE
        1 = 1
        ${
          data.is_deleted
            ? ` AND u.is_deleted = ${data.is_deleted}`
            : ` AND u.is_deleted = 0`
        }
        ${
          data.name
            ? `AND LOWER(full_name) like '%${data.name.toLowerCase()}%'`
            : ""
        }
        ${data.company_id ? `AND u.company_id = ${data.company_id}` : ""}
      ORDER BY c."name", u."full_name"
      OFFSET ${paginationParam.offset} 
      LIMIT ${paginationParam.limit};
    `);

    return { users, count };
  }

  public async getMfaSecretAgainstCompany(companyId) {
    let secrets = await this.Repository.createQueryBuilder("user")
      .select(["user.Id"])
      .innerJoinAndSelect("user.mfa_secret", "mfa_secret")
      .where(`user.company_id = ${companyId}`)
      .getMany();

    return secrets;
  }

  public async FindTeamAndOwnerByPlanId(
    planId: number,
    companyId: number
  ): Promise<UserModel[]> {
    const planOwnerAndTeamSubQuery = `
      SELECT u."Id"
      FROM plan_owner po
      INNER JOIN "user" u
        ON po.user_id = u."Id"
          AND u.is_deleted = 0
          AND u.company_id = ${companyId}
      WHERE po.plan_id = ${planId}
      UNION
      SELECT u."Id"
      FROM plan_team pt
      INNER JOIN "user" u
      ON pt.user_id = u."Id"
        AND u.is_deleted = 0
        AND u.company_id = ${companyId}
      WHERE pt.plan_id = ${planId}
    `;

    const users = await this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where(`"user"."Id" IN (${planOwnerAndTeamSubQuery})`)
      .getMany();

    return users;
  }

  public async FindTeamAndOwnerByCommunicationId(
    communicationId: number,
    companyId: number
  ): Promise<UserModel[]> {
    let userIds = await this.Repository.query(`
      WITH 
        owner AS (
          SELECT u."Id"
          FROM "user" u
          INNER JOIN communication c 
            ON c.owner_id = u."Id"
              AND c."Id" = ${communicationId}
          WHERE u.is_deleted = 0 AND u.company_id = ${companyId}
        ), team as (
          SELECT u."Id"
          FROM "user" u
          INNER JOIN communication_team ct
            ON ct.user_id = u."Id"
              AND ct.communication_id = ${communicationId}
          WHERE u.is_deleted = 0 AND u.company_id = ${companyId}
        )
        SELECT * FROM owner
        UNION
        SELECT * FROM team
    `);

    if (!userIds.length) return [];

    userIds = userIds.map(({ Id }) => +Id);

    const users = await this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where('"user"."Id" IN (:...userIds)', { userIds })
      .getMany();

    return users;
  }

  public async FindOwnerByPlanId(
    planId: number,
    companyId: number
  ): Promise<UserModel[]> {
    let userIds = await this.Repository.query(`
      SELECT u."Id"
      FROM plan
      LEFT JOIN plan_owner po
        ON plan."Id" = po.plan_id 
      LEFT JOIN "user" u
        ON po.user_id = u."Id"
      WHERE u.is_deleted = 0
      AND po.plan_id = ${planId}
      AND u.company_id = ${companyId}
    `);

    if (!userIds.length) return [];

    userIds = userIds.map(({ Id }) => +Id);

    const users = await this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where('"user"."Id" IN (:...userIds)', { userIds })
      .getMany();

    return users;
  }

  public async FindTeamByPlanId(
    planId: number,
    companyId: number
  ): Promise<UserModel[]> {
    let userIds = await this.Repository.query(`
      SELECT u."Id"
      FROM plan
      LEFT JOIN plan_team pt
        ON plan."Id" = pt.plan_id 
      LEFT JOIN "user" u
        ON pt.user_id = u."Id"
      WHERE u.is_deleted = 0 
      AND pt.plan_id = ${planId}
      AND u.company_id = ${companyId}
    `);

    if (!userIds.length) return [];

    userIds = userIds.map(({ Id }) => +Id);

    const users = await this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where('"user"."Id" IN (:...userIds)', { userIds })
      .getMany();

    return users;
  }

  public async FindOwnerByCommunicationId(
    communicationId: number,
    companyId: number
  ): Promise<UserModel[]> {
    let userIds = await this.Repository.query(`
      SELECT u."Id"
      FROM "user" u
      INNER JOIN communication c 
        ON c.owner_id = u."Id"
      WHERE u.is_deleted = 0
      AND c."Id" = ${communicationId}
      AND u.company_id = ${companyId}
    `);

    if (!userIds.length) return [];

    userIds = userIds.map(({ Id }) => +Id);

    const users = await this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where('"user"."Id" IN (:...userIds)', { userIds })
      .getMany();

    return users;
  }

  public async FindTeamByCommunicationId(
    communicationId: number,
    companyId: number
  ): Promise<UserModel[]> {
    let userIds = await this.Repository.query(`
      SELECT u."Id"
      FROM communication
      LEFT JOIN communication_team AS ct
        ON communication."Id" = ct.communication_id 
      LEFT JOIN "user" AS u
        ON ct.user_id = u."Id"
      WHERE u.is_deleted = 0
      AND ct.communication_id = ${communicationId}
      AND u.company_id = ${companyId}
    `);

    if (!userIds.length) return [];

    userIds = userIds.map(({ Id }) => +Id);

    const users = await this.Repository.createQueryBuilder("user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where('"user"."Id" IN (:...userIds)', { userIds })
      .getMany();

    return users;
  }

  public async GetUsersForFilter(data: UserSearchRequest, user: IRedisUserModel) {
    const paginationParam = GetPaginationOptions(data);

    let userListQuery = this.Repository.createQueryBuilder("user")
      .select([
        "user.Id",
        "user.full_name",
        "user.image_url",
        "user.is_deleted",
        "user.email",
      ])
      .leftJoin(
        "user.business_area_permission",
        "user_business_area_permission"
      )
      .where(`user.company_id = ${user.company_id}`)
  
    if (data.is_deleted != null) {
      userListQuery.andWhere(`user.is_deleted = :isDeleted`, { isDeleted: +data.is_deleted });
    }

    if (data.user) {
      userListQuery.andWhere(
        `(
					"user".full_name ILIKE :name OR
          "user".email ILIKE :name
				)`,
        { name: `%${data.user}%` }
      );
    }

    if (data.business_areas && data.business_areas.length) {
      userListQuery.andWhere(
        `(
					user_business_area_permission.business_area_id IN (:...businessAreas)
					OR "user".role = '${UserRoles.Owner}'
				)`, 
        { businessAreas: data.business_areas }
      );
    }

    if (data.roles) {
      userListQuery.andWhere(`"user".role IN (:...roles)`, { roles: data.roles });
    }

    if (data.business_area_permission && data.business_area_permission.length) {
      userListQuery.andWhere(`(
				(user_business_area_permission.permission IN (:...permissions))
				OR "user".role = '${UserRoles.Owner}'
			)`, { permissions: data.business_area_permission });
    }

    let [userList, userCount] = await userListQuery
      .orderBy("user.is_deleted", "ASC") // show active users first
      .addOrderBy(
        data.column ? `user.${data.column}` : "user.full_name",
        data.direction ? data.direction : "ASC"
      )
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return [userList, userCount];
  }

  public async GetTeamByCommunicationId(communicationId: number, select?: Array<string>) {
    select.push(
      "user.Id",
      "user_setting.Id",
      "user_setting.receive_email_notification",
      "user_setting.status_change_notification",
      "user_setting.assignment_notification",
      "user_setting.start_date_notification",
    );
    return await this.Repository.createQueryBuilder("user")
      .select(select)
      .innerJoin(
        "communication_team",
        "ct",
        "ct.user_id = user.Id AND ct.communication_id = :communicationId",
        { communicationId },
      )
      .innerJoin("user.user_setting", "user_setting")
      .getMany();
  }
}
