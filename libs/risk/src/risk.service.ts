
import { RiskRepository } from "../../repository/risk/RiskRepository";
import { CreateRiskRequest, GetRisksRequest } from "../../../api/controller/risk/RiskRequest";
import { IRedisUserModel, UserModel } from "../../model/user/UserModel";
import { CheckUserPermissionForPlan, CheckUserPermissionForPlanEdit } from "../../helpers/PermissionHelper";
import { PlanRepository } from "../../repository/plan/PlanRepository";
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { UserRepository } from "../../repository/user/UserRepository";
import { RiskModel } from "../../model/risk/RiskModel";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { BadRequestException } from "routing-controllers";
import { DeepClone } from "../../helpers/UtilHelper";
import { NotificationConstant, NotificationConstants } from "../../constant/NotificationConstants";
import { NotificationService } from "../notification/NotificationService";
import { AnalyticsRequest } from "../../../api/controller/analytics/AnalyticsRequest";

@Injectable()
export class RiskService {
  constructor(
    private riskRepository: RiskRepository,
    private companyRepository: CompanyRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService,

    // used in CheckUserPermissionForPlanEdit
    private planRepository: PlanRepository,
    private planPermissionRepository: PlanPermissionRepository,
  ) {}

  private buildRiskSequence(companyName: string, riskSeq: number) {
    // If company name contain more than 1 word,
    // then use the first letters of the first two words
    // otherwise use the first two letters of the company name

    const words = companyName.split(" ");
    let prefix = "";
    if (words.length > 1) {
      prefix = words[0][0] + words[1][0];
    } else {
      prefix = words[0][0] + words[0][1];
    }
    prefix = `${prefix.toUpperCase()}R-${riskSeq}`;
    return prefix;
  }

  private async SendRiskAssignmentNotification(risk, notif: NotificationConstant) {
    const company = await this.companyRepository.FindOne({
      Id: risk.company_id,
      notification_enabled: true,
    });

    if (!company) {
      return true;
    }

    const notificationConstant = DeepClone(notif);
    notificationConstant.body = notificationConstant.body.replace(
      "{{title}}",
      risk.title,
    );
    notificationConstant.info = {
      risk_id: risk.Id,
      risk_number: risk.risk_number,
      plan_id: risk.plan_id,
    }

    await this.notificationService.SendNotification(
      notificationConstant,
      [risk.owner],
      "assignment_notification",
    );
  }

  public async CreateRisk(data: CreateRiskRequest, user: IRedisUserModel) {
    await CheckUserPermissionForPlanEdit(this, data.plan_id, user);

    const [company, nextRiskNumber, owner] = await Promise.all([
      this.companyRepository.FindOne({ Id: user.company_id }),
      this.riskRepository.GetNextRiskNumber(user.company_id),
      this.userRepository.FindOne({
        Id: data.owner_id,
        company_id: user.company_id,
        is_deleted: 0,
      }),
    ]);

    if (!owner) {
      throw new BadRequestException("Owner not found");
    }

    const riskModel = new RiskModel();
    riskModel.plan_id = data.plan_id;
    riskModel.company_id = user.company_id;
    riskModel.title = data.title;
    riskModel.description = data.description;
    riskModel.impact = data.impact;
    riskModel.likelihood = data.likelihood;
    riskModel.mitigation = data.mitigation;
    riskModel.status = data.status;
    riskModel.owner_id = data.owner_id;
    riskModel.created_by = user.Id;
    riskModel.risk_number = this.buildRiskSequence(company.name, nextRiskNumber);
    
    const risk = await this.riskRepository.Create(riskModel);

    risk.owner = owner;
    this.SendRiskAssignmentNotification(risk, NotificationConstants.RiskAssigned);
    return risk;
  }

  public async UpdateRisk(riskId: number, data: CreateRiskRequest, user: IRedisUserModel) {
    await CheckUserPermissionForPlanEdit(this, data.plan_id, user);

    const riskModel = await this.riskRepository.FindOne(
      {
        Id: riskId,
        company_id: user.company_id,
      },
      {
        relations: ["owner"],
      }
    );

    if (!riskModel) {
      throw new BadRequestException("Risk not found");
    }

    let assignee = riskModel.owner, unassginee: UserModel;
    if (riskModel.owner_id != data.owner_id) {
      const owner = await this.userRepository.FindOne({
        Id: data.owner_id,
        company_id: user.company_id,
        is_deleted: 0,
      });

      if (!owner) {
        throw new BadRequestException("Owner not found");
      }

      assignee = owner;
      unassginee = riskModel.owner;
    }

    riskModel.title = data.title;
    riskModel.description = data.description;
    riskModel.impact = data.impact;
    riskModel.likelihood = data.likelihood;
    riskModel.mitigation = data.mitigation;
    riskModel.status = data.status;
    riskModel.owner_id = data.owner_id;
    riskModel.updated_by = user.Id;

    await this.riskRepository.Update(
      { Id: riskId },
      {
        title: data.title,
        description: data.description,
        impact: data.impact,
        likelihood: data.likelihood,
        mitigation: data.mitigation,
        status: data.status,
        owner_id: data.owner_id,
      }
    );

    riskModel.owner = assignee;
    if (unassginee) {
      Promise.all([
        this.SendRiskAssignmentNotification(
          riskModel,
          NotificationConstants.RiskAssigned
        ),
        this.SendRiskAssignmentNotification(
          { ...riskModel, owner: unassginee },
          NotificationConstants.RiskUnassigned
        ),
      ]);
    }

    return riskModel;
  }

  public async DeleteRisk(riskId: number, user: IRedisUserModel) {
    const risk = await this.riskRepository.FindOne({
      Id: riskId,
      company_id: user.company_id,
    });

    if (!risk) {
      throw new BadRequestException("Risk not found");
    }

    await CheckUserPermissionForPlanEdit(this, risk.plan_id, user);

    await this.riskRepository.DeleteById(riskId, false);
    return true;
  }

  public async GetRisks(data: GetRisksRequest, user: IRedisUserModel) {
    await CheckUserPermissionForPlan(this, data.plan_id, user);

    const risks = await this.riskRepository.GetRisks(data, user.company_id);
    return risks;
  }

  public async GetAnalyticsRiskCategoryCount(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {
    const riskCategoryCount = await this.riskRepository.GetAnalyticsRiskCategoryCount(
      data,
      user
    );
    return riskCategoryCount;
  }

  public async GetHighRiskPlans(
    data: AnalyticsRequest,
    user: IRedisUserModel,
  ) {
    const highRiskPlans = await this.riskRepository.GetHighRiskPlans(
      data,
      user
    );
    return highRiskPlans;
  }
}