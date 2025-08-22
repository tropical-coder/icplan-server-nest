import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PlanPermissionModel } from "../entities/plan_permission.entity";
import { SimpleRepository } from "@app/common/base/simple.repository";

export class PlanPermissionRepository extends SimpleRepository<PlanPermissionModel> {
  constructor(
    @InjectRepository(PlanPermissionModel)
    private readonly planPermissionRepository: Repository<PlanPermissionModel>,
  ) {
    super(planPermissionRepository);
  }

  public async FindPlanPermission(planIds, userId, permission) {
    let planPermission = await this.Repository.createQueryBuilder(
      "plan_permission"
    )
      .where(`plan_id IN (:...planIds)`, { planIds })
      .andWhere(`user_id = ${userId}`)
      .andWhere(`permission = '${permission}'`)
      .getMany();

    return planPermission;
  }

  public async AddOwnerToPlanPermission(planId, user) {
    await this.Repository.query(`
			INSERT INTO plan_permission ("plan_id", "user_id", "permission")
			(
				SELECT
					${planId} AS "plan_id", u."Id" AS "user_id",
					'edit'::plan_permission_permission_enum AS "permission"
				FROM "user" AS u
				WHERE u.role = 'owner'
				  AND u.company_id = ${user.company_id}
			) ON CONFLICT DO NOTHING
		`);
  }

  public async AddUserPlanPermission(user, permission) {
    await this.Repository.query(`
			INSERT INTO plan_permission ("plan_id", "user_id", "permission") 
			(
				SELECT
					DISTINCT plan_id, ${user.Id} AS "user_id", 
					'${permission}'::plan_permission_permission_enum AS "permission"
				FROM plan_business_area pba
				WHERE pba.business_area_id IN (
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

  public async AddPlanUsersPermission(planId, permission, user) {
    await this.Repository.query(`
			INSERT INTO plan_permission ("plan_id", "user_id", "permission") 
			(
				SELECT
					DISTINCT ${planId} as "plan_id", ubap.user_id, 
					'${permission}'::plan_permission_permission_enum AS "permission"
				FROM user_business_area_permission ubap
				where ubap."permission" = '${permission}' AND ubap.business_area_id IN (
					WITH RECURSIVE 
					starting ("Id", "name", parent_id) AS
					(
						SELECT t."Id", t.name, t.parent_id
						FROM "business_area" AS t
						WHERE t."Id" IN (
							SELECT pba.business_area_id
							FROM plan_business_area pba
								WHERE pba.plan_id = ${planId}
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

  public async DeletePlanPermissionByCompanyId(companyId) {
    await this.Repository.query(`
			DELETE FROM plan_permission
			WHERE plan_id IN (
				SELECT "Id"
				FROM plan AS p
				WHERE p.company_id = ${companyId}
			)
		`);
  }
}
