import { SimpleRepository } from "@app/common/base/simple.repository";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserPermission } from "@app/business_area/entities/user_business_area_permission.entity";
import { CommunicationPermissionModel } from "../entities/communication_permission.entity";
import { IRedisUserModel } from "@app/user/entities/user.entity";

export class CommunicationPermissionRepository extends SimpleRepository<CommunicationPermissionModel> {
  constructor(
    @InjectRepository(CommunicationPermissionModel)
    private readonly communicationPermissionRepository: Repository<CommunicationPermissionModel>,
  ) {
    super(communicationPermissionRepository);
  }
	
	public async FindCommunicationPermissions(
		communicationIds: number[],
		userId: number,
		permission?: UserPermission,
	) {
		let communicationPermissionQB = this.Repository.createQueryBuilder("communication_permission")
			.where(`communication_id IN (${communicationIds})`)
			.andWhere(`user_id = ${userId}`);
		
		if (permission) {
			communicationPermissionQB.andWhere(`permission = '${permission}'`);
		}

		let communicationPermission = await communicationPermissionQB.getMany();
		return communicationPermission;
	}


  public async FindCommunicationPermission(
    communicationId: number,
    userId: number,
    permission?
  ) {
    let communicationPermissionQB = this.Repository.createQueryBuilder(
      "communication_permission"
    )
      .where(`communication_id = ${communicationId}`)
      .andWhere(`user_id = ${userId}`);

    if (permission) {
      communicationPermissionQB.andWhere(`permission = '${permission}'`);
    }

    let communicationPermission = await communicationPermissionQB.getMany();

    return communicationPermission;
  }

  public async AddOwnerToCommunicationPermission(
    communicationIds: number[],
    user: IRedisUserModel | any
  ) {
    await this.Repository.query(`
			INSERT INTO communication_permission ("communication_id", "user_id", "permission")
			(
				SELECT
					DISTINCT unnest(ARRAY[${communicationIds}]) as "communication_id", u."Id" AS "user_id",
					'edit'::communication_permission_permission_enum AS "permission"
				FROM "user" AS u
				WHERE u.role = 'owner'
				  AND u.company_id = ${user.company_id}
			) ON CONFLICT DO NOTHING
		`);
  }

  public async AddUserCommunicationPermission(
    user: IRedisUserModel | any,
    permission
  ) {
    await this.Repository.query(`
			INSERT INTO communication_permission ("communication_id", "user_id", "permission") 
			(
				SELECT
					DISTINCT communication_id, ${user.Id} AS "user_id", 
					'${permission}'::communication_permission_permission_enum AS "permission"
				FROM communication_business_area cba
				WHERE cba.business_area_id IN (
					WITH RECURSIVE 
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "business_area" AS t
						WHERE t."Id" IN (
							SELECT business_area_id
							FROM user_business_area_permission ubap
								WHERE ubap.user_id = ${user.Id} AND ubap."permission" = '${permission}'
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
				)
			) ON CONFLICT DO NOTHING
		`);
  }

  public async AddCommunicationUsersPermission(
    communicationIds: number[],
    permission,
    user: IRedisUserModel | any
  ) {
    await this.Repository.query(`
			INSERT INTO communication_permission ("communication_id", "user_id", "permission") 
			(
				SELECT
					DISTINCT unnest(ARRAY[${communicationIds}]) as "communication_id", ubap.user_id, 
					'${permission}'::communication_permission_permission_enum AS "permission"
				FROM user_business_area_permission ubap
				where ubap."permission" = '${permission}' AND ubap.business_area_id IN (
					WITH RECURSIVE 
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "business_area" AS t
						WHERE t."Id" IN (
							SELECT cba.business_area_id
							FROM communication_business_area cba
								WHERE cba.communication_id = ANY(ARRAY[${communicationIds}])
						)
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
					) AND company_id = ${user.company_id}
				)
			) ON CONFLICT DO NOTHING
		`);
  }

  public async DeleteCommunicationPermissionByCompanyId(companyId: number) {
    await this.Repository.query(`
			DELETE FROM communication_permission
			WHERE communication_id IN (
				SELECT "Id"
				FROM communication AS comm
				WHERE comm.company_id = ${companyId}
			)
		`);
  }
}
