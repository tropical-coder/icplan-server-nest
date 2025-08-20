
import { PhaseRepository } from "../../repository/phase/PhaseRepository";
import { IRedisUserModel } from "../../model/user/UserModel";
import { CheckUserPermissionForPlanEdit } from "../../helpers/PermissionHelper";
import { UserRepository } from "../../repository/user/UserRepository";
import { BadRequestException } from "routing-controllers";
import { PhaseModel } from "../../model/phase/PhaseModel";
import { CreatePhaseRequest, UpdatePhaseRequest } from "../../../api/controller/phase/PhaseRequest";
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { PlanRepository } from "../../repository/plan/PlanRepository";

@Injectable()
export class PhaseService {
  constructor(
    private phaseRepository: PhaseRepository,
    private userRepository: UserRepository,
    // used in CheckUserPermissionForPlanEdit
    private planPermissionRepository: PlanPermissionRepository,
    private planRepository: PlanRepository,
  ) {}

  public async CreatePhase(data: CreatePhaseRequest, user: IRedisUserModel) {
    const planPermissionPromise = CheckUserPermissionForPlanEdit(
      this,
      data.plan_id,
      user
    );
    const ownerPromise = this.userRepository.FindOne({
      Id: data.owner_id,
      is_deleted: 0,
      company_id: user.company_id,
    });
    const overlappingPhasePromise = this.phaseRepository.OverlappingPhase(
      data.plan_id,
      data.start_date,
      data.end_date
    );

    const [{ planModel }, ownerModel, overlappingPhase] = await Promise.all([
      planPermissionPromise,
      ownerPromise,
      overlappingPhasePromise,
    ]);

    if (
      (!planModel.ongoing && data.start_date > planModel.end_date) ||
       data.end_date < planModel.start_date
    ) {
      throw new BadRequestException("Phase dates are not within the plan dates.");
    }

    if (!ownerModel) {
      throw new BadRequestException("User not found.");
    }

    if (overlappingPhase) {
      throw new BadRequestException("Phase dates are overlapping with another phase.");
    }

    const phaseModel = new PhaseModel();
    phaseModel.title = data.title;
    phaseModel.description = data.description;
    phaseModel.status = data.status;
    phaseModel.start_date = data.start_date;
    phaseModel.end_date = data.end_date;
    phaseModel.plan_id = planModel.Id;
    phaseModel.owner_id = ownerModel.Id;
    phaseModel.company_id = user.company_id;

    await this.phaseRepository.Save(phaseModel);

    return phaseModel;
  }

  public async UpdatePhase(phaseId: number, data: UpdatePhaseRequest, user: IRedisUserModel) {
    const phase = await this.phaseRepository.FindOne({
      Id: phaseId,
      company_id: user.company_id,
    });

    if (!phase) {
      throw new BadRequestException("Phase not found.");
    }

    const planPermissionPromise = CheckUserPermissionForPlanEdit(
      this,
      phase.plan_id,
      user
    );

    const ownerPromise = this.userRepository.FindOne({
      Id: data.owner_id,
      is_deleted: 0,
      company_id: user.company_id,
    });

    const overlappingPhasePromise = this.phaseRepository.OverlappingPhase(
      phase.plan_id,
      data.start_date,
      data.end_date
    );

    const [{ planModel }, ownerModel, overlappingPhase] = await Promise.all([
      planPermissionPromise,
      ownerPromise,
      overlappingPhasePromise,
    ]);

    if (
      (!planModel.ongoing && data.start_date > planModel.end_date) ||
       data.end_date < planModel.start_date
    ) {
      throw new BadRequestException("Phase dates are not within the plan dates.");
    }

    if (!ownerModel) {
      throw new BadRequestException("User not found.");
    }

    if (overlappingPhase && overlappingPhase.Id !== phase.Id) {
      throw new BadRequestException("Phase dates are overlapping with another phase.");
    }

    phase.title = data.title;
    phase.description = data.description;
    phase.status = data.status;
    phase.start_date = data.start_date;
    phase.end_date = data.end_date;
    phase.owner_id = ownerModel.Id;

    await this.phaseRepository.Save(phase);

    return phase;
  }

  public async DeletePhase(phaseId: number, user: IRedisUserModel) {
    const phase = await this.phaseRepository.FindOne({
      Id: phaseId,
      company_id: user.company_id,
    });

    if (!phase) {
      throw new BadRequestException("Phase not found.");
    }

    await CheckUserPermissionForPlanEdit(
      this,
      phase.plan_id,
      user
    );

    await this.phaseRepository.Delete(
      { 
        Id: phaseId,
        company_id: user.company_id,
      },
      false
    );

    return;
  }
}
