
import { PlanPermissionRepository } from "../../repository/plan/PlanPermissionRepository";
import { UserRepository } from "../../repository/user/UserRepository";
import { AddCommentRequest, GetCommentsRequest, UpdateCommentRequest } from "../../../api/controller/comment/CommentRequest";
import { IRedisUserModel, UserModel, UserRoles } from "../../model/user/UserModel";
import { CheckUserPermissionForCommunication, CheckUserPermissionForPlan } from "../../helpers/PermissionHelper";
import { CommentModel } from "../../model/comment/CommentModel";
import { BadRequestException } from "routing-controllers";
import { CommentRepository } from "../../repository/comment/CommentRepository";
import { PlanRepository } from "../../repository/plan/PlanRepository";
import { PlanModel } from "../../model/plan/PlanModel";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { NotificationConstants } from "../../constant/NotificationConstants";
import { DeepClone } from "../../helpers/UtilHelper";
import { NotificationService } from "../notification/NotificationService";
import { In } from "typeorm";
import { SendSocketEvent } from "../../helpers/SocketEmitter";
import { SocketClientEventName } from "../../../api/socket/SocketEventHandler";
import { CommunicationRepository } from "../../repository/communication/CommunicationRepository";
import { CommunicationModel } from "../../model/communication/CommunicationModel";
import { CommunicationPermissionRepository } from "../../repository/communication/CommunicationPermissionRepository";

@Injectable()
export class CommentService {
  constructor(
    private commentRepository: CommentRepository,
    private planRepository: PlanRepository,
    private companyRepository: CompanyRepository,
    private notificationService: NotificationService,
    private planPermissionRepository: PlanPermissionRepository,
    private userRepository: UserRepository,
    private communicationRepository: CommunicationRepository,
    private communicationPermissionRepository: CommunicationPermissionRepository,
  ) {}

  private async SendTaggedInCommentNotification(
    entity: PlanModel | CommunicationModel,
    taggedUsers: UserModel[],
    commentId: number,
  ) {
    const isComm: boolean = entity instanceof CommunicationModel;

    const company = await this.companyRepository.FindOne({
      Id: entity.company_id,
      notification_enabled: true,
    });

    if (!company) return true;

    const constant = DeepClone(NotificationConstants.TaggedInComment);
    constant.body = constant.body
      .replace("{{title}}", entity.title)
      .replace("{{entity}}", isComm ? "communication" : "plan")

    constant.info = {
      comment_id: commentId,
      plan_id: isComm ? (entity as CommunicationModel).plan_id : entity.Id,
      communication_id: isComm ? entity.Id : undefined,
    };

    await this.notificationService.SendNotification(
      constant,
      taggedUsers,
    );

    return true;
  }

  private confidentialUserCheck({ owner, team }, user) {
    const ownerMatched = owner.filter(
      (ownerUser) => user.Id == ownerUser.Id
    );

    const teamMatched = team.filter((teamUser) => user.Id == teamUser.Id);

    if (
      !ownerMatched.length &&
      !teamMatched.length
    ) {
      throw new BadRequestException("One or more tagged users don't have permission to plan");
    }
  }

  private async CheckTaggedUserPermissionForPlan(
    plan: PlanModel,
    taggedUserIds: number[],
  ): Promise<UserModel[]> {
    if (!taggedUserIds || !taggedUserIds.length) {
      return [];
    }

    const taggedUsers = await this.userRepository.Find({
      Id: In(taggedUserIds),
      company_id: plan.company_id,
      is_deleted: 0,
    });

    if (taggedUsers.length !== taggedUserIds.length) {
      throw new BadRequestException("One or more tagged users not found");
    }

    const nonOwnerUsers = taggedUsers.filter(u => u.role != UserRoles.Owner); 

    const planPermissions = await this.planPermissionRepository.Count({
      plan_id: plan.Id,
      user_id: In(nonOwnerUsers.map(u => u.Id)),
    });

    if (planPermissions !== nonOwnerUsers.length) {
      throw new BadRequestException("One or more tagged users don't have permission to plan");
    }

    if (plan.is_confidential) {
      for (const user of nonOwnerUsers) {
        this.confidentialUserCheck(plan, user);
      }
    }

    return taggedUsers;
  }

  private async CheckTaggedUserPermissionForCommunication(
    communication: CommunicationModel,
    taggedUserIds: number[],
  ): Promise<UserModel[]> {
    if (!taggedUserIds || !taggedUserIds.length) {
      return [];
    }
    const taggedUsers = await this.userRepository.Find({
      Id: In(taggedUserIds),
      company_id: communication.company_id,
      is_deleted: 0,
    });

    if (taggedUsers.length !== taggedUserIds.length) {
      throw new BadRequestException("One or more tagged users not found");
    }

    const nonOwnerUsers = taggedUsers.filter(u => u.role != UserRoles.Owner); 

    const communicationPermissions = await this.communicationPermissionRepository.Count({
      communication_id: communication.Id,
      user_id: In(nonOwnerUsers.map(u => u.Id)),
    });

    if (communicationPermissions !== nonOwnerUsers.length) {
      throw new BadRequestException("One or more tagged users don't have permission to communication");
    }

    if (communication.is_confidential) {
      for (const user of nonOwnerUsers) {
        this.confidentialUserCheck(
          {
            owner: [communication.owner],
            team: communication.team,
          },
          user,
        );
      }
    }

    return taggedUsers;
  }

  public async AddPlanComment(
    data: AddCommentRequest,
    user: IRedisUserModel,
  ) {
    await CheckUserPermissionForPlan(this, data.plan_id, user);

    const planPr = this.planRepository.GetPlanById(
      data.plan_id,
      user,
      ["owner", "team"],
    );
    const commenterPr = this.userRepository.FindById(
      user.Id,
      { 
        select: ["Id", "full_name", "is_deleted", "image_url"],
        loadEagerRelations: false
      }
    );

    const [plan, commenter] = await Promise.all([planPr, commenterPr]);

    data.tagged_users = [...new Set(data.tagged_users)]

    const taggedUsers = 
      await this.CheckTaggedUserPermissionForPlan(plan, data.tagged_users);

    if (plan.is_confidential && user.role != UserRoles.Owner) {
      this.confidentialUserCheck(plan, user)
    }

    const newComment = new CommentModel();
    newComment.plan_id = data.plan_id;
    newComment.user_id = user.Id;
    newComment.company_id = user.company_id;
    newComment.content = data.content;
    newComment.tagged_users = data.tagged_users;

    await this.commentRepository.Save(newComment);

    this.SendTaggedInCommentNotification(
      plan,
      taggedUsers.filter(u => u.Id != user.Id),
      newComment.Id,
    );

    newComment.user = commenter;

    SendSocketEvent(
      SocketClientEventName.CommentAdded,
      `Plan-${newComment.plan_id}`,
      newComment,
    );

    return newComment;
  }

  public async AddCommunicationComment(
    data: AddCommentRequest,
    user: IRedisUserModel,
  ) {
    await CheckUserPermissionForCommunication(this, data.communication_id, user);

    const communicationPr = this.communicationRepository.FindOne(
      { Id: data.communication_id, company_id: user.company_id },
      {
        relations: ["owner", "team"],
      }
    );

    const commenterPr = this.userRepository.FindById(
      user.Id,
      { 
        select: ["Id", "full_name", "is_deleted", "image_url"],
        loadEagerRelations: false
      }
    );

    const [communication, commenter] = await Promise.all([communicationPr, commenterPr]);
    
    data.tagged_users = [...new Set(data.tagged_users)];

    const taggedUsers = 
      await this.CheckTaggedUserPermissionForCommunication(communication, data.tagged_users);

    if (communication.is_confidential && user.role != UserRoles.Owner) {
      this.confidentialUserCheck(
        {
          owner: [communication.owner],
          team: communication.team,
        },
        user
      );
    }

    const newComment = new CommentModel();
    newComment.plan_id = communication.plan_id;
    newComment.communication_id = data.communication_id;
    newComment.user_id = user.Id;
    newComment.company_id = user.company_id;
    newComment.content = data.content;
    newComment.tagged_users = data.tagged_users;

    await this.commentRepository.Save(newComment);

    this.SendTaggedInCommentNotification(
      communication,
      taggedUsers.filter(u => u.Id != user.Id),
      newComment.Id,
    );

    newComment.user = commenter;

    // TODO: Create communication room, when FE is going to integrate comment sockets
    // SendSocketEvent(
    //   SocketClientEventName.CommentAdded,
    //   `Communication-${newComment.communication_id}`,
    //   newComment,
    // );

    return newComment;
  }
  public async UpdateComment(
    commentId: number,
    data: UpdateCommentRequest,
    user: IRedisUserModel,
  ) {
    const newCommentPr = this.commentRepository.FindOne({
      Id: commentId,
      user_id: user.Id,
    });
    const commenterPr = this.userRepository.FindById(
      user.Id,
      { 
        select: ["Id", "full_name", "is_deleted", "image_url"],
        loadEagerRelations: false
      }
    );
    const [newComment, commenter] = await Promise.all([
      newCommentPr,
      commenterPr,
    ]);

    if (!newComment) {
      throw new BadRequestException("Comment not found");
    }

    if (newComment.communication_id) {
      await CheckUserPermissionForCommunication(this, newComment.communication_id, user);
    } else {
      await CheckUserPermissionForPlan(this, newComment.plan_id, user);
    }

    newComment.content = data.content;
    newComment.updated_at = Date.now().toString();
    await this.commentRepository.Update(
      { Id: commentId },
      {
        content: newComment.content,
        updated_at: newComment.updated_at,
      },
    );

    newComment.user = commenter;

    return newComment;
  }

  public async DeleteComment(
    commentId: number,
    user: IRedisUserModel,
  ) {
    const comment = await this.commentRepository.FindOne({
      Id: commentId,
      company_id: user.company_id,
      user_id: user.Id,
    });

    if (!comment) {
      throw new BadRequestException("Comment not found");
    }

    await this.commentRepository.Delete(commentId, false);

    return true;
  }

  public async GetComments(params: GetCommentsRequest, user: IRedisUserModel) {
    if (params.communication_id) {
      await CheckUserPermissionForCommunication(this, params.communication_id, user);
    } else {
      await CheckUserPermissionForPlan(this, params.plan_id, user);
    }

    const comments = await this.commentRepository.GetComments(
      params,
      user,
    );

    return comments;
  }
}