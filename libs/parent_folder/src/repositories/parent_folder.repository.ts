import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import {
import { GetPaginationOptions } from "../../helpers/UtilHelper";
import { ParentFolderModel } from "../../model/parent_folder/ParentFolderModel";
import { BaseRepository } from "@app/common/base/base.repository";
import { Brackets, In } from "typeorm";
import { PlanStatus } from "../../model/plan/PlanModel";
import { filter } from "compression";

export class ParentFolderRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(ParentFolderModel)
    private parentFolderModelRepository: Repository<ParentFolderModel>,
  ) {
    super([^Repository);
  }

  public async fetchParentFolder(
    parentFolderIds: Array<number>,
    companyId: number,
    select?: Array<string>,
  ) {
    let parentFolderPromise: Promise<ParentFolderModel[]> = new Promise(
      (resolve) => {
        resolve([]);
      }
    );

    if (parentFolderIds && parentFolderIds.length > 0) {
      parentFolderPromise = this.Find(
        {
          Id: In(parentFolderIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return parentFolderPromise;
  }

  public async GetParentFolders(
    filters: GetParentFolderAndPlanRequest,
    user: IRedisUserModel,
    parentFolderIdsQuery?: string,
    pinned: boolean = null,
    isfilterApplied: boolean = false,
  ) {
    let parentFolderQB = this.Repository.createQueryBuilder("folder")
      .select(["folder", "parent_folder.Id", "parent_folder.name"])
      .leftJoinAndSelect(
        "folder.pin_folder",
        "pin_folder",
        `pin_folder.user_id = ${user.Id}`,
      )
      .leftJoin("folder.parent_folder", "parent_folder")
      .where("folder.company_id = :companyId", {
        companyId: user.company_id,
      });

    if (pinned != null) {
      parentFolderQB.andWhere(`
        pin_folder.user_id IS ${pinned ? "NOT" : "" } NULL
      `);

      if (filters.page_type == ParentFolderPage.Homepage && !pinned) {
        parentFolderQB.andWhere("folder.parent_folder_id IS NULL");
      }
    }

    if (isfilterApplied) {
      if (filters.page_type == ParentFolderPage.Homepage) {
        if (filters.parent_folder_id?.length) {
          parentFolderIdsQuery +=
            ` INTERSECT SELECT unnest(ARRAY[${filters.parent_folder_id.join(",")}])`;
        }
        parentFolderQB.andWhere(`(
          folder.Id IN (${parentFolderIdsQuery})
          ${pinned ? `OR folder.parent_folder_id IN (${parentFolderIdsQuery})` : ""}
        )`);
      }
      else {
        parentFolderQB.andWhere(`folder.parent_folder_id IN (:...parentFolderIds)`, {
          parentFolderIds: filters.parent_folder_id
        });
      }
    }

    const parentFolder = await parentFolderQB
      .orderBy("folder.parent_folder_id IS NOT NULL")
      .addOrderBy("folder.name", "ASC")
      .getMany();

    return parentFolder;
  }

  public async SearchParentFolder(data: ParentFolderSearchRequest, company_id) {
    const parentFolder = await this.Repository.query(`
      WITH RECURSIVE foldertree AS (
        (
            SELECT 
                "Id", 
                name, 
                ARRAY[]::bigint[] AS ancestors             -- Initialize the empty ancestor array
            FROM parent_folder
            where company_id = ${company_id} AND parent_folder_id IS NULL
        )
        UNION ALL
        (
            SELECT 
                this."Id", 
                this.name, 
                "prior".ancestors || this.parent_folder_id  -- Append the parent id to the ancestor array
            FROM foldertree "prior"
            INNER JOIN parent_folder this ON this.parent_folder_id = "prior"."Id"
        )
      )
    ${data.name ? `,
      matching_folders AS ( -- Find folders matching the search term
        SELECT *
        FROM foldertree
        WHERE name ILIKE $1
      ),
      -- Find all ancestors of matching folders
      all_ancestors AS (
        SELECT DISTINCT unnest(ancestors) AS ancestor_id
        FROM matching_folders
        UNION
        SELECT "Id" FROM matching_folders
      )`: ""
    }
      SELECT 
        ft."Id", 
        ft.name, 
        array_to_json(ft.ancestors)::jsonb ancestors
      FROM foldertree ft
      WHERE 1=1
      ${data.exclude_sub_folder ? "AND cardinality(ft.ancestors) = 0" : ""}
      ${data.name ? `AND ft."Id" IN (SELECT ancestor_id FROM all_ancestors)` : "" }
      ORDER BY cardinality(ft.ancestors), ft.name;
    `, data.name ? [`%${data.name}%`] : []);

    return parentFolder;
  }

  public async GetParentFoldersAndPlans(
    data: GetParentFolderAndPlanRequest,
    parentFolderIds: Number[],
    planIds: Number[],
    user: IRedisUserModel,
  ): Promise<ParentFolderModel[]> {
    const paginationParam = GetPaginationOptions(data);

    if (!planIds || !planIds.length) {
      planIds = [0];
    }

    let parentFolders = await this.Repository.createQueryBuilder(
      "parent_folder"
    )
      .select([
        "parent_folder",
        "plan.Id",
        "plan.title",
        "plan.start_date",
        "plan.ongoing",
        "plan.end_date",
        "plan.status",
        "plan.color",
        "plan.parent_folder_id",
        "sub_plans.Id",
        "sub_plans.title",
        "sub_plans.start_date",
        "sub_plans.ongoing",
        "sub_plans.end_date",
        "sub_plans.status",
        "sub_plans.color",
        "sub_plans.parent_folder_id",
      ])
      .leftJoin(
        "parent_folder.plans",
        "plan",
        `(
            plan."Id" IN (${planIds.join(",")})
            OR plan."Id" IS NULL
          )`
      )
      .leftJoinAndSelect("parent_folder.sub_folder", "sub_folder")
      .leftJoin(
        "sub_folder.plans",
        "sub_plans",
        `(
            sub_plans."Id" IN (${planIds.join(",")})
            OR sub_plans."Id" IS NULL
          )`
      )
      .leftJoinAndSelect(
        "plan.plan_permission",
        "plan_permission",
        `user_id = ${user.Id}`
      )
      .leftJoinAndSelect(
        "sub_plans.plan_permission",
        "sub_folder_plan_permission",
        `sub_folder_plan_permission.user_id = ${user.Id}`
      )
      .andWhere(`parent_folder.parent_folder_id IS NULL`)
      .andWhere(
        `(
          (
            parent_folder."Id" IN (${parentFolderIds.join(",")})
            OR
            sub_folder."Id" IN (${parentFolderIds.join(",")})
           ) AND (
             parent_folder.company_id = ${user.company_id}
             OR parent_folder."Id" = 0
            )
        )`
      )
      .orderBy(`parent_folder.name`, "ASC")
      .addOrderBy(
        data.column ? `plan.${data.column}` : "plan.start_date",
        data.direction ? data.direction : "ASC"
      )
      .addOrderBy(
        data.column ? `sub_plans.${data.column}` : "sub_plans.start_date",
        data.direction ? data.direction : "ASC"
      )
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getMany();

    return parentFolders;
  }

  public async GetPlanCount(
    parentFolderIds: number[] | Number[],
    user: IRedisUserModel
  ): Promise<any[]> {

    if (!parentFolderIds.length) {
      parentFolderIds = [0];
    }

    const planCount = await this.Repository.query(`
      WITH RECURSIVE folder_tree(initial_folder_id, id) AS (
          SELECT f_id, pf."Id"
          FROM unnest(ARRAY[${parentFolderIds.join(",")}]) AS f_id
          INNER JOIN parent_folder pf ON pf."Id" = f_id
          UNION ALL
          SELECT ft.initial_folder_id, pf."Id"
          FROM parent_folder pf
          INNER JOIN folder_tree ft ON pf.parent_folder_id = ft.id
      )
      SELECT 
          ft.initial_folder_id AS "Id", 
 	        COUNT(DISTINCT CASE WHEN plan."status" != 'archived' THEN plan."Id" END) AS plan_count,
          COUNT(DISTINCT CASE WHEN plan."status" = 'archived' THEN plan."Id" END) AS archived_plan_count
      FROM plan
      ${
        user.role != UserRoles.Owner ? `
        LEFT JOIN plan_permission pp 
            ON pp.plan_id = plan."Id" 
            AND pp.user_id = ${user.Id}
        LEFT JOIN plan_team 
            ON plan_team.plan_id = plan."Id"
        LEFT JOIN plan_owner 
            ON plan_owner.plan_id = plan."Id"`
        : ""
      }
      INNER JOIN folder_tree ft 
          ON plan.parent_folder_id = ft.id
      WHERE 
          plan.company_id = ${user.company_id}
          ${user.role != UserRoles.Owner ? `
            AND pp.plan_id IS NOT NULL
            AND (
                plan.is_confidential = FALSE
                OR plan.is_confidential IS NULL
                OR plan_team.user_id = ${user.Id}
                OR plan_owner.user_id = ${user.Id}
            )` : ""}
      GROUP BY ft.initial_folder_id;
    `);

    return planCount;
  }

  public async GetFolderAncestors(parentFolderId: number, companyId: number) {
    const folderAncestors = await this.Repository.query(`
      WITH RECURSIVE folder_ancestors AS (
        -- Base Case: Start with the given folder ID
        SELECT "Id", name, parent_folder_id 
        FROM parent_folder
        WHERE company_id = ${companyId} AND "Id" = ${parentFolderId}
    
        UNION ALL
    
        -- Recursive Step: Get the parent of the current folder
        SELECT parent."Id", parent.name, parent.parent_folder_id
        FROM parent_folder parent
        INNER JOIN folder_ancestors child ON parent."Id" = child.parent_folder_id
      )
      SELECT *
      FROM folder_ancestors;
    `);

    return folderAncestors;
  }

  public async GetFolderDescendants(parentFolderId: number, user: IRedisUserModel) {
    const folderDescendants = await this.Repository.query(`
      WITH RECURSIVE folder_descendants AS (
        SELECT "Id", name, parent_folder_id
        FROM parent_folder
        WHERE company_id = ${user.company_id} AND "Id" = ${parentFolderId}

        UNION ALL

        SELECT child."Id", child.name, child.parent_folder_id
        FROM parent_folder child
        INNER JOIN folder_descendants parent 
          ON child.parent_folder_id = parent."Id"
      )
      SELECT *
      FROM folder_descendants;
    `);

    return folderDescendants;
  }

}
