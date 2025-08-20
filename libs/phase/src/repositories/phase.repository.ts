import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { PhaseModel } from "../../model/phase/PhaseModel";
import { IRedisUserModel, UserRoles } from "../../model/user/UserModel";
import { BaseRepository } from "@app/common/base/base.repository";

@Injectable()
export class PhaseRepository extends BaseRepository<PhaseModel> {
  constructor(
    @InjectRepository(PhaseModel)
    private phaseModelRepository: Repository<PhaseModel>,
  ) {
    super(phaseModelRepository);
  }

  public async OverlappingPhase(planId: number, startDate: Date, endDate: Date) {
    const phase: PhaseModel = await this.phaseModelRepository.createQueryBuilder("phase")
      .where("phase.plan_id = :planId", { planId })
      .andWhere("phase.start_date <= :endDate", { endDate })
      .andWhere("phase.end_date >= :startDate", { startDate })
      .getOne();
    return phase;
  }

  public async GetPhasesByPlanId(planId: number): Promise<PhaseModel[]> {
    const phases: PhaseModel[] = await this.phaseModelRepository.createQueryBuilder("phase")
      .select([
        "phase",
        "owner.Id",
        "owner.full_name",
        "owner.is_deleted",
        "owner.image_url",
      ])
      .innerJoin("phase.owner", "owner")
      .where("phase.plan_id = :planId", { planId })
      .orderBy("phase.start_date", "ASC")
      .getMany();

    return phases;
  }

  public async GetPhasesForPlanDashboard(
    planId: number,
    start: Date,
    end: Date,
    user: IRedisUserModel
  ) {
    const phasesPr = this.phaseModelRepository.query(`
      SELECT 
        phase."Id" as "Id",
        phase.title as title,
        phase.start_date as start_date,
        phase.end_date as end_date,
        phase.status as status,
        COUNT(communication."Id")::INT as communication_count
      FROM phase
      LEFT JOIN communication
        ON communication.start_date BETWEEN phase.start_date AND phase.end_date
        AND communication.plan_id = phase.plan_id
      INNER JOIN communication_permission cp
        ON cp.communication_id = communication."Id"
        AND cp.user_id = ${user.Id}
      WHERE 
        phase.plan_id = ${planId}
        AND phase.company_id = ${user.company_id}
        AND phase.start_date <= '${end.toISOString()}'
        AND phase.end_date >= '${start.toISOString()}'
        AND (
          ${user.role == UserRoles.Owner}
          OR communication.is_confidential != TRUE
          OR EXISTS (
            SELECT user_id 
            FROM communication_team 
            WHERE communication_id = communication."Id" AND user_id = ${user.Id}
          )
          OR communication.owner_id = ${user.Id}
        )
      GROUP BY phase."Id"
      ORDER BY phase.start_date ASC;
    `);

    const uncatergorizedPr = this.phaseModelRepository.query(`
      SELECT
        null AS "Id",
        'Uncategorised' AS title,
        null AS start_date,
        null AS end_date,
        null AS status,
        COUNT(*) AS communication_count
      FROM communication c
      INNER JOIN communication_permission cp 
        ON cp.communication_id = c."Id"
        AND cp.user_id = ${user.Id}
      LEFT JOIN
        phase ph ON ph.plan_id = c.plan_id
          AND c.start_date BETWEEN ph.start_date AND ph.end_date
      WHERE
        c.plan_id = ${planId}
        AND ph."Id" IS NULL
        AND c.company_id = ${user.company_id}
        AND (
          ${user.role == UserRoles.Owner}
          OR c.is_confidential != TRUE
          OR EXISTS (
            SELECT user_id 
            FROM communication_team 
            WHERE communication_id = c."Id" AND user_id = ${user.Id}
          )
          OR c.owner_id = ${user.Id}
        )
    `);

    const [phases, uncatergorized] = await Promise.all([
      phasesPr,
      uncatergorizedPr,
    ]);

    if (uncatergorized.length > 0) {
      phases.push(uncatergorized[0]);
    }

    return phases;
  }
}