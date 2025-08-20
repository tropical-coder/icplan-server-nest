import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { TaskModel, TaskStatus } from "../../model/task/TaskModel";
import { filterQBParams, GetPaginationOptions } from "../../helpers/UtilHelper";
import { AddUserBusinessAreaRestriction } from "../../helpers/PermissionHelper";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { CompanyModel } from "../../model/company/CompanyModel";
import { GetTasksForKanbanRequest } from "../../../api/controller/task/TaskRequest";
import { Brackets } from "typeorm";
import { GetRecurringTasksRequest } from "../../../api/controller/task/RecurringTaskRequest";
import { PhaseModel } from "../../model/phase/PhaseModel";

export class TaskRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(TaskModel)
    private taskModelRepository: Repository<TaskModel>,
  ) {
    super([^Repository);
  }

  public async GetTasksByDateRange(
    data,
    user: IRedisUserModel
  ): Promise<TaskModel[]> {
    // build dynamic filter snippets
    const statusFilter = data.status?.length
      ? `AND c.status IN ('${data.status.join("','")}')`
      : "";
    const parentFolderFilter = data.parent_folder_id?.length
      ? `AND p.parent_folder_id IN (
          SELECT pf."Id"
          FROM parent_folder pf
          WHERE
            pf."Id" IN (${data.parent_folder_id.join(',')})
            OR pf.parent_folder_id IN (${data.parent_folder_id.join(',')})
        )`
      : "";
    const planIdFilter = data.plan_id?.length
      ? `AND t.plan_id IN (${data.plan_id.join(',')})`
      : "";
    const ownerFilter = data.owner?.length
      ? `AND c.owner_id IN (${data.owner.join(',')})`
      : "";
    const businessAreaFilter = data.business_area?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_business_area cba
          WHERE cba.communication_id = t.communication_id
            AND cba.business_area_id IN (${data.business_area.join(',')})
        )`
      : "";
    const tagFilter = data.tag?.length
      ? `AND (
          EXISTS (
            SELECT 1 FROM task_tag tt
            WHERE tt.task_id = t."Id"
              AND tt.tag_id IN (${data.tag.join(',')})
          )
          OR EXISTS (
            SELECT 1 FROM communication_tag ct
            WHERE ct.communication_id = t.communication_id
              AND ct.tag_id IN (${data.tag.join(',')})
          )
        )`
      : "";
    const contentTypeFilter = data.content_type?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_content_type cct
          WHERE cct.communication_id = t.communication_id
            AND cct.content_type_id IN (${data.content_type.join(',')})
        )`
      : "";
    const strategicPriorityFilter = data.strategic_priority?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_strategic_priority csp
          WHERE csp.communication_id = t.communication_id
            AND csp.strategic_priority_id IN (${data.strategic_priority.join(',')})
        )`
      : "";
    const teamFilter = data.team?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_team ct
          WHERE ct.communication_id = t.communication_id
            AND ct.user_id IN (${data.team.join(',')})
        )`
      : "";
    const locationFilter = data.location?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_location cl
          WHERE cl.communication_id = t.communication_id
            AND cl.location_id IN (${data.location.join(',')})
        )`
      : "";
    const audienceFilter = data.audience?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_audience ca
          WHERE ca.communication_id = t.communication_id
            AND ca.audience_id IN (${data.audience.join(',')})
        )`
      : "";
    const channelFilter = data.channel?.length
      ? `AND EXISTS (
          SELECT 1 FROM communication_channel cc
          WHERE cc.communication_id = t.communication_id
            AND cc.channel_id IN (${data.channel.join(',')})
        )`
      : "";

    const sql = `
      SELECT
        t.*,
        jsonb_build_object(
          'Id', u."Id",
          'full_name', u.full_name,
          'is_deleted', u.is_deleted
        ) AS "user",
        CASE 
          WHEN c."Id" IS NOT NULL 
          THEN jsonb_build_object(
            'Id', c."Id",
            'title', c.title
          )
        END AS communication,
        jsonb_build_object(
          'Id', p."Id",
          'title', p.title,
          'color', p.color,
          'is_starred', p.is_starred
        ) AS plan
      FROM task t
      INNER JOIN "user" u
        ON u."Id" = t.assigned_to
      LEFT JOIN communication c
        ON c."Id" = t.communication_id
      LEFT JOIN plan p
        ON p."Id" = t.plan_id
      WHERE
        t.company_id = ${user.company_id}
        AND t.due_date BETWEEN DATE('${data.start_date}') AND DATE('${data.end_date}')
        AND (
          t.plan_id IS NULL
          OR (
            t.communication_id IS NULL
            AND p.show_on_calendar = TRUE
            AND (
              ${user.role == UserRoles.Owner}
              OR t.assigned_to = ${user.Id}
              OR EXISTS (
                SELECT 1 FROM plan_team pt
                WHERE pt.plan_id = t.plan_id
                  AND pt.user_id = ${user.Id}
              )
              OR EXISTS (
                SELECT 1 FROM plan_owner po
                WHERE po.plan_id = t.plan_id
                  AND po.user_id = ${user.Id}
              )
            )
          )
          OR (
            c.show_on_calendar = TRUE
            AND (
              ${user.role == UserRoles.Owner}
              OR t.assigned_to = ${user.Id}
              OR EXISTS (
                SELECT 1 FROM communication_team ct2
                WHERE ct2.communication_id = t.communication_id
                  AND ct2.user_id = ${user.Id}
              )
              OR c.owner_id = ${user.Id}
              OR (
                c.is_confidential = FALSE
                AND (
                  EXISTS (
                    SELECT 1 FROM plan_team pt
                    WHERE pt.plan_id = t.plan_id
                      AND pt.user_id = ${user.Id}
                  )
                  OR EXISTS (
                    SELECT 1 FROM plan_owner po
                    WHERE po.plan_id = t.plan_id
                      AND po.user_id = ${user.Id}
                  )
                )
              )
            )
          )
        )
        ${statusFilter}
        ${parentFolderFilter}
        ${planIdFilter}
        ${ownerFilter}
        ${businessAreaFilter}
        ${tagFilter}
        ${contentTypeFilter}
        ${strategicPriorityFilter}
        ${teamFilter}
        ${locationFilter}
        ${audienceFilter}
        ${channelFilter}
      ORDER BY
        t.due_date,
        t.name;
    `;

    return this.Repository.query(sql);
  }

  public async GetGanttChartTasksByCommunicationId(
    user: IRedisUserModel,
    communicationId: number,
    data
  ) {
    const tasksQuery = this.Repository.createQueryBuilder("task")
      .select(["task", "plan.Id", "plan.color"])
      .innerJoinAndSelect("task.communication", "communication")
      .innerJoin("communication.plan", "plan")
      .leftJoin("communication.tags", "tags")
      .leftJoin("communication.strategic_priorities", "strategic_priorities")
      .leftJoin("communication.team", "team")
      .leftJoin("communication.business_areas", "business_area")
      .leftJoin("communication.locations", "location")
      .leftJoin("communication.audiences", "audience")
      .leftJoin("communication.channels", "channel")
      .leftJoin("communication.content_types", "content_type")
      .leftJoin("communication.owner", "owner")
      .where(
        `
        task.company_id = ${user.company_id} 
        AND task.communication_id = ${communicationId} 
        AND task.due_date >= DATE('${data.start_date}') 
        AND task.due_date <= DATE('${data.end_date}')
      `
      );

    filterQBParams(tasksQuery, data, user);

    tasksQuery.orderBy("task.due_date");
    tasksQuery.addOrderBy("task.name");
    let tasks = await tasksQuery.getMany();

    return tasks;
  }

  public async GetTasksByCompanyId(companyId: number, communicationId: number) {
    const tasks = await this.Repository.createQueryBuilder("task")
      .select(["task", "plan.Id", "communication.Id", "tags.Id"])
      .innerJoinAndSelect("task.communication", "communication")
      .innerJoinAndSelect("communication.plan", "plan")
      .leftJoinAndSelect("task.tags", "tags")
      .where(
        `
        task.company_id = ${companyId} 
        AND task.communication_id = ${communicationId}
      `
      )
      .getMany();

    return tasks;
  }

  public async GetTasksByCommunicationId(
    companyId: number,
    communicationId: number,
    data: PaginationParam
  ) {
    const paginationParam = GetPaginationOptions(data);
    const [tasks, count] = await this.Repository.createQueryBuilder("task")
    // TODO remove select comm. and plan join (unnecessary)
      .innerJoinAndSelect("task.communication", "communication")
      .innerJoinAndSelect("communication.plan", "plan")
      .innerJoinAndSelect("task.user", "user")
      .leftJoinAndSelect("task.tags", "tags")
      .leftJoinAndMapOne(
        "task.phase",
        PhaseModel,
        "phase",
        `task.plan_id = phase.plan_id
          AND task.due_date BETWEEN phase.start_date AND phase.end_date`
      )
      .where(`task.company_id = ${companyId}`)
      .andWhere(`task.communication_id = ${communicationId}`)
      .offset(paginationParam.offset)
      .limit(paginationParam.limit)
      .orderBy("task.due_date", "ASC")
      .getManyAndCount();

    return { tasks, count };
  }

  public async FindTasksForNotification({ statuses }): Promise<TaskModel[]> {
    const tasks = await this.Repository.createQueryBuilder("task")
      .innerJoinAndMapOne(
        "task.company",
        CompanyModel,
        "company",
        'company."Id" = task.company_id'
      )
      .leftJoinAndSelect("task.communication", "communication")
      .innerJoinAndSelect("task.user", "user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where("company.notification_enabled = true")
      .andWhere(
        `task.due_date - company.notification_before_days = CURRENT_DATE`
      )
      .andWhere(`task.status IN (:...statuses)`, { statuses })
      .andWhere("user_setting.start_date_notification = true")
      .getMany();

    return tasks;
  }

  public async FindOverDueTasksForNotification({
    statuses,
  }): Promise<TaskModel[]> {
    const tasks = await this.Repository.createQueryBuilder("task")
      .innerJoinAndMapOne(
        "task.company",
        CompanyModel,
        "company",
        'company."Id" = task.company_id'
      )
      .innerJoinAndSelect("task.user", "user")
      .leftJoinAndSelect("user.user_setting", "user_setting")
      .where("company.notification_enabled = true")
      .andWhere(`task.due_date + 1 = CURRENT_DATE`)
      .andWhere(`task.status IN (:...statuses)`, { statuses })
      .andWhere("user_setting.start_date_notification = true")
      .getMany();

    return tasks;
  }

  public async GetTasksForKanban(
    filter: GetTasksForKanbanRequest,
    user: IRedisUserModel
  ) {
    const paginationParam = GetPaginationOptions(filter);
    const tasksQB = this.Repository.createQueryBuilder("task")
      .leftJoin("task.communication", "communication")
      .leftJoin("communication.communication_team", "communication_team")
      .leftJoin("task.plan", "plan")
      .leftJoin("plan.plan_team", "plan_team")
      .leftJoin("plan.plan_owner", "plan_owner")
      .leftJoin(
        "plan.plan_permission",
        "plan_permission",
        `plan_permission.user_id = ${user.Id}`,
      )
      .leftJoin("task.tags", "tag")
      .leftJoin("task.user", "user")
      .leftJoinAndMapOne(
        "task.phase",
        PhaseModel,
        "phase",
        `task.plan_id = phase.plan_id
          AND task.due_date BETWEEN phase.start_date AND phase.end_date`
      )
      .select([
        "task",
        "communication.Id",
        "communication.title",
        "tag.Id",
        "tag.name",
        "user.Id",
        "user.full_name",
        "user.is_deleted",
        "user.image_url",
        "plan.Id",
        "plan.title",
        "plan.color",
        "plan_permission",
        "plan.start_date",
        "plan.end_date",
        "plan.ongoing",
        "phase.Id",
        "phase.title",
      ])
      .where("task.company_id = :companyId", { companyId: user.company_id })
      .andWhere(new Brackets((qb) => {
        qb
          .where(`task.plan_id IS NULL`) // floating tasks
          .orWhere(`task.assigned_to = ${user.Id}`)
          .orWhere(`'${user.role}' IN (:...roles)`, { 
            roles: [UserRoles.Owner, UserRoles.Admin] 
          })
          .orWhere("communication.is_confidential = false")
          .orWhere(`communication_team.user_id = ${user.Id}`)
          .orWhere(`communication.owner_id = ${user.Id}`)
          .orWhere("plan.is_confidential = false")
          .orWhere(`plan_team.user_id = ${user.Id}`)
          .orWhere(`plan_owner.user_id = ${user.Id}`)
        }),
      );

    if (filter.assigned_to?.length) {
      tasksQB.andWhere("task.assigned_to IN (:...assignedTo)", {
        assignedTo: filter.assigned_to,
      });
    } else if (filter.show_my_tasks_only) {
      tasksQB.andWhere("task.assigned_to = :assigned_to", {
        assigned_to: user.Id,
      });
    }

    if (filter.name) {
      tasksQB.andWhere(
        "(task.name ILIKE :name OR task.description ILIKE :name)",
        { name: `%${filter.name}%` }
      );
    }

    if (filter.due_date) {
      tasksQB.andWhere("task.due_date = :due_date", {
        due_date: filter.due_date,
      });
    }

    if (filter.status?.length) {
      tasksQB.andWhere("task.status IN (:...statuses)", {
        statuses: filter.status,
      });
    }

    if (filter.tag_ids?.length) {
      tasksQB.andWhere("tag.Id IN (:...tag_ids)", { tag_ids: filter.tag_ids });
    }

    if (filter.show_plan_tasks_only) {
      tasksQB.andWhere("task.plan_id IS NOT NULL");
      tasksQB.andWhere("task.communication_id IS NULL");
    }

    if (filter.communication_ids?.length) {
      tasksQB.andWhere("communication.Id IN (:...communication_ids)", {
        communication_ids: filter.communication_ids,
      });
    }

    if (filter.plan_ids?.length) {
      tasksQB.andWhere(`task.plan_id IN (:...plan_ids)`,
        { plan_ids: filter.plan_ids }
      );
    }

    if (filter.status?.includes(TaskStatus.Archived)) {
      tasksQB.orderBy("task.updated_at", "DESC");
    } else {
      tasksQB.orderBy("task.due_date", "ASC");
    }
    tasksQB.addOrderBy("task.communication_id", "ASC");

    const [tasks, count] = await tasksQB
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return { tasks, count };
  }

  public async GetTaskById(taskId: number, user: IRedisUserModel) {
    const task = await this.Repository.createQueryBuilder("task")
      .select([
        "task",
        "user.Id",
        "user.full_name",
        "user.image_url",
        "user.is_deleted",
        "communication.Id",
        "communication.title",
        "comm_business_area.Id",
        "comm_business_area.name",
        "plan.Id",
        "plan.color",
        "plan.start_date",
        "plan.end_date",
        "plan.ongoing",
        "plan.title",
        "plan_permission",
        "business_area.Id",
        "business_area.name",
        "parent_folder.Id",
        "parent_folder.name",
        "parent_parent_folder.Id",
        "parent_parent_folder.name",
      ])
      .innerJoinAndSelect("task.user", "user")
      .leftJoinAndSelect("task.tags", "tags")
      .leftJoin("task.communication", "communication")
      .leftJoin("task.plan", "plan")
      .leftJoin("plan.business_areas", "business_area")
      .leftJoin(
        "plan.plan_permission",
        "plan_permission",
        `plan_permission.user_id = ${user.Id}`,
      )
      .leftJoin("plan.parent_folder", "parent_folder")
      .leftJoin("parent_folder.parent_folder", "parent_parent_folder")
      .leftJoin("communication.business_areas", "comm_business_area")
      .leftJoinAndMapOne(
        "task.phase",
        PhaseModel,
        "phase",
        `task.plan_id = phase.plan_id
          AND task.due_date BETWEEN phase.start_date AND phase.end_date`
      )
      .where("task.Id = :taskId", { taskId })
      .andWhere("task.company_id = :companyId", { companyId: user.company_id })
      .getOne();

    return task;
  }

  public async GetRecurringTasks(
    data: GetRecurringTasksRequest,
    user: IRedisUserModel,
  ): Promise<{ tasks: TaskModel[], count: number}> {
    const paginationParam = GetPaginationOptions(data);
    const taskQb = this.Repository.createQueryBuilder("task")
      .select([
        "task",
        "communication.Id",
        "communication.title",
        "tag.Id",
        "tag.name",
        "user.Id",
        "user.full_name",
        "user.is_deleted",
        "user.image_url",
        "plan.Id",
        "plan.title",
        "plan.color",
      ])
      .leftJoin("task.communication", "communication")
      .leftJoin("task.plan", "plan")
      .leftJoin("task.tags", "tag")
      .innerJoin("task.user", "user")
      .where("task.company_id = :companyId", { companyId: user.company_id })
      .andWhere("task.parent_id = :parentId", { parentId: data.task_id });

    if (data.status?.length) {
      taskQb.andWhere("task.status IN (:...status)", { status: data.status });
    }

    if (data.name) {
      taskQb.andWhere(`(
        task.name ILIKE :name 
          OR task.description ILIKE :name
        )`,
        { name: `%${data.name}%`}
      );
    }

    const [tasks, count] = await taskQb
      .orderBy("task.due_date", "ASC")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();
    return { tasks, count };
  }
}
