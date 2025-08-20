import { HttpError } from "routing-controllers";
import { BadRequestException, ResponseCode } from "./ServerResponse";
import { UserPermission } from "../model/user/business_area_permission/UserBusinessAreaPermissionModel";
import { UserRoles, IRedisUserModel, UserModel } from "../model/user/UserModel";
import { In } from "typeorm";
import { PlanModel } from "../model/plan/PlanModel";
import { PlanPermissionModel } from "../model/plan/PlanPermissionModel";
import { CommunicationPermissionModel } from '../model/communication/CommunicationPermissionModel';

export async function CheckUserPermissionForPlanEdit(
  ref,
  planId,
  user
): Promise<{ planModel: PlanModel; userModel: UserModel }> {
  let planPermissionPromise = ref.planPermissionRepository.FindOne({
    plan_id: planId,
    user_id: user.Id,
    permission: UserPermission.Edit,
  });

  let planPromise = ref.planRepository.FindOne(
    { Id: planId, company_id: user.company_id },
    { loadEagerRelations: false }
  );

  let userPromise = ref.userRepository.FindOne({
    Id: user.Id,
    company_id: user.company_id,
  });

  let [planModel, userModel, planPermission] = await Promise.all([
    planPromise,
    userPromise,
    planPermissionPromise,
  ]);

  if (!planModel) {
    throw new BadRequestException("Plan Not Found");
  } else if (![UserRoles.Owner].includes(userModel.role) && !planPermission) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user is not allowed to perform this action."
    );
  }

  return { planModel, userModel };
}

export async function CheckUserPermissionForCommunicationEdit(
  ref,
  commId: number,
  user: IRedisUserModel,
) {
  if (user.role == UserRoles.Owner) {
    return true;
  }

  const commPermission = await ref.communicationPermissionRepository.FindOne({
    communication_id: commId,
    user_id: user.Id,
    permission: UserPermission.Edit,
  });

  if (!commPermission) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user is not allowed to perform this action."
    );
  }

  return true;
}

export async function CheckUserPermissionForPlan(ref, planId, user): Promise<PlanPermissionModel> {
  let planPermissionPromise = ref.planPermissionRepository.FindOne(
    {
      plan_id: planId,
      user_id: user.Id,
    },
    { relations: ["plan"] }
  );

  let userPromise = ref.userRepository.FindOne({
    Id: user.Id,
    company_id: user.company_id,
  });

  let [userModel, planPermission] = await Promise.all([
    userPromise,
    planPermissionPromise,
  ]);

  if (UserRoles.Owner != userModel.role && !planPermission) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user is not allowed to perform this action."
    );
  }

  return planPermission;
}

export async function CheckUserPermissionForCommunication(
  ref,
  communicationId: number,
  user: IRedisUserModel
): Promise<CommunicationPermissionModel> {
  const commPermission = await ref.communicationPermissionRepository.FindOne(
    {
      communication_id: communicationId,
      user_id: user.Id,
    },
    { relations: ["communication"] }
  );

  if (UserRoles.Owner != user.role && !commPermission) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user is not allowed to perform this action."
    );
  }

  return commPermission;
}

export async function CheckUserPermissionForMultiplePlans(
  ref,
  planIds: number[],
  user: IRedisUserModel,
) {
  let planPermissionPromise = ref.planPermissionRepository.FindPlanPermission(
    planIds,
    user.Id,
    UserPermission.Edit
  );

  let planPromise = ref.planRepository.Find({
    Id: In(planIds),
    company_id: user.company_id,
  });
  let userPromise = ref.userRepository.FindOne({
    Id: user.Id,
    company_id: user.company_id,
  });

  let [planModels, userModel, planPermission] = await Promise.all([
    planPromise,
    userPromise,
    planPermissionPromise,
  ]);

  if (!planModels) {
    throw new BadRequestException("Entity Not Found");
  }

  if (![UserRoles.Owner].includes(userModel.role))
    for (let index = 0, len = planModels.length; index < len; index++) {
      if (!planPermission.find((pp) => planModels[index].Id == pp.plan_id)) {
        throw new HttpError(
          ResponseCode.BAD_REQUEST,
          "This user is not allowed to perform this action."
        );
      }
    }

  return { planModels, userModel };
}

export async function CheckUserPermissionForMultipleCommunications(
  ref,
  commIds: number[],
  user: IRedisUserModel
) {
  if (user.role == UserRoles.Owner) {
    return true;
  }
  const commPermission =
    await ref.communicationPermissionRepository.FindCommunicationPermissions(
      commIds,
      user.Id,
      UserPermission.Edit,
    );

  if (commPermission.length != commIds.length) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user is not allowed to perform this action."
    );
  }

  return true;
}

export async function AddBusinessAreaRestriction(
  ref,
  data,
  user: IRedisUserModel
) {
  if (user.role === UserRoles.Owner) {
    return data;
  }
  const businessAreaIds = (
    await ref.businessAreaService.GetDecendentsByUserId(user)
  ).map(({ Id }) => Id);
  if (data["business_area"]) {
    let businessAreas = await ref.businessAreaService.GetAllBusinessAreaLevels(
      data.business_area,
      user.company_id
    );
    return {
      ...data,
      business_area: businessAreaIds.filter((Id) => {
        return businessAreas.find(({ baId }) => baId === Id);
      }),
    };
  } else {
    return {
      ...data,
      business_area: businessAreaIds,
    };
  }
}

export function AddUserBusinessAreaRestriction(user: IRedisUserModel) {
  return `(
    WITH RECURSIVE 
      starting ("Id", "name", parent_id) AS
      (
        SELECT t."Id", t.name, t.parent_id
        FROM "business_area" AS t
        WHERE t."Id" IN (
          SELECT business_area_id
          FROM user_business_area_permission ubap
            WHERE ubap.user_id = ${user.Id}
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
    )`;
}

export async function CheckUserPermissionForBusinessAreas(
  ref,
  businessAreaIds: number[],
  user: IRedisUserModel,
) {
  if (user.role == UserRoles.Owner) {
    return;
  }
  const userBusinessAreaPermissions = 
    await ref.userBusinessAreaPermissionRepository.GetEffectiveBusinessAreaPermissions(
      businessAreaIds,
      user.Id,
    );

  if (userBusinessAreaPermissions.length !== businessAreaIds.length) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user does not have access to all the business areas."
    );
  }

  // Check if user has edit permission in any of the business area
  const baWithEdit = userBusinessAreaPermissions.find(
    (ubap) => ubap.effective_permission == UserPermission.Edit
  );

  if (!baWithEdit) {
    throw new HttpError(
      ResponseCode.BAD_REQUEST,
      "This user does not have edit right in any of the business area."
    );
  }

  return;
}
