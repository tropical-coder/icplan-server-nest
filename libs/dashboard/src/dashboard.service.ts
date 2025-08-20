import { Injectable } from "@nestjs/common";

@Injectable()
export class DashboardService {
  constructor(
    private budgetRepository: BudgetRepository,
    private riskRepository: RiskRepository,
    private phaseRepository: PhaseRepository,
    private communicationRepository: CommunicationRepository,
    private planRepository: PlanRepository,
    // Used in CheckUserPermissionForPlan
    private planPermissionRepository: PlanPermissionRepository,
    private userRepository: UserRepository
  ) {}

  public async GetCombinedBudget(planId: number, user: IRedisUserModel) {
    let plan: PlanModel;
    const pp = await CheckUserPermissionForPlan(
      this,
      planId,
      user
    );

    if (pp && pp.plan) {
      plan = pp.plan;
    } else {
      plan = await this.planRepository.FindOne({ Id: planId, company_id: user.company_id });
    }

    if (!plan) {
      throw new BadRequestException("Plan not found.");
    }

    if (plan.hide_budget && user.role != UserRoles.Owner) {
      const planUsers = await this.planRepository.FindPlanUsers(
        planId,
        {},
        user.company_id
      );
      if (!planUsers.find((u) => u.Id == user.Id)) {
        throw new BadRequestException(
          "The user is not allowed to view the budget."
        );
      }
    }

    const combinedBudget =
      await this.budgetRepository.GetPlanActualAndPlannedBudget(planId);

    return combinedBudget;
  }

  public async GetRiskCategoryCount(planId: number, user: IRedisUserModel) {
    await CheckUserPermissionForPlan(this, planId, user);

    const riskCategoryCount = await this.riskRepository.GetRiskCategoryCount(
      planId,
      user
    );

    return riskCategoryCount;
  }

  public async GetCommunicationStatusCountGroupedByPhase(
    planId: number,
    user: IRedisUserModel
  ) {
    await CheckUserPermissionForPlan(this, planId, user);

    const communicationStatusCount =
      await this.communicationRepository.GetCommunicationStatusCountGroupedByPhase(
        planId,
        user
      );

    return communicationStatusCount;
  }

  public async GetPhasesForPlanDashboard(
    planId: number,
    data: DateRangeRequest,
    user: IRedisUserModel,
  ) {
    await CheckUserPermissionForPlan(this, planId, user);

    const phases = await this.phaseRepository.GetPhasesForPlanDashboard(
      planId,
      new Date(data.start_date),
      new Date(data.end_date),
      user
    );

    return phases;
  }

  public async GetCommunicationsForPlanDashboard(
    planId: number,
    data: GetCommunicationsForPlanDashboardRequest,
    user: IRedisUserModel,
  ) {
    await CheckUserPermissionForPlan(this, planId, user);

    const communications = await this.communicationRepository.GetCommunicationsForPlanDashboard(
      planId,
      data,
      user
    );

    return communications;
  }
}