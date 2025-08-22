import { BaseRepository } from "@app/common/base/base.repository";
import { UserBusinessAreaPermissionModel } from "../entities/user_business_area_permission.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

export class UserBusinessAreaPermissionRepository extends BaseRepository<UserBusinessAreaPermissionModel> {
  constructor(
    @InjectRepository(UserBusinessAreaPermissionModel)
    private readonly userBusinessAreaPermissionRepository: Repository<UserBusinessAreaPermissionModel>
  ) {
    super(userBusinessAreaPermissionRepository);
  }

  public async GetEffectiveBusinessAreaPermissions(
    businessAreaIds: number[],
    userId: number
  ) {
    const businessAreas = this.Repository.query(`
      WITH RECURSIVE 
      ancestry AS (
        SELECT 
          ba."Id",
          ba.name,
          ba.parent_id,
          ba."Id" as requested_id,
          0 as level
        FROM business_area ba
        WHERE ba."Id" IN (${businessAreaIds})
        UNION ALL
        SELECT 
          p."Id",
          p.name,
          p.parent_id,
          a.requested_id,
          a.level + 1
        FROM business_area p
        INNER JOIN ancestry a ON p."Id" = a.parent_id
      ),
      permissions AS (
        SELECT 
          ubap.business_area_id,
          ubap.permission,
          a.requested_id,
          a.level
        FROM user_business_area_permission ubap
        INNER JOIN ancestry a ON ubap.business_area_id = a."Id"
        WHERE ubap.user_id = ${userId}
      )
      SELECT DISTINCT
        a.requested_id as business_area_id,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM permissions p2 
            WHERE p2.requested_id = a.requested_id 
            AND p2.permission = 'edit'
          ) THEN 'edit'
          ELSE 'read'
        END as effective_permission
      FROM ancestry a
      WHERE a.level = 0
      AND EXISTS (
        SELECT 1 FROM permissions p 
        WHERE p.requested_id = a.requested_id
      );`);

    return businessAreas;
  }
}
