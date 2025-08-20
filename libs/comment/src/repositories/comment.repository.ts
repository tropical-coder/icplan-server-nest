import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { CommentModel } from "../../model/comment/CommentModel";
import { GetCommentsRequest } from "../../../api/controller/comment/CommentRequest";
import { IRedisUserModel } from "../../model/user/UserModel";

@Injectable()
export class CommentRepository extends BaseRepository<CommentModel> {
  constructor(
    @InjectRepository(CommentModel)
    private commentModelRepository: Repository<CommentModel>,
  ) {
    super(commentModelRepository);
  }

  public async GetComments(params: GetCommentsRequest, user: IRedisUserModel) {
    const query = this.Repository.createQueryBuilder("comment")
      .select([
        "comment",
        "user.Id",
        "user.full_name",
        "user.is_deleted",
        "user.image_url",
      ])
      .innerJoin("comment.user", "user")
      .where("comment.company_id = :companyId", {
        companyId: user.company_id,
      })
      .andWhere("comment.plan_id = :planId", {
        planId: params.plan_id,
      });

    if (params.communication_id) {
      query.andWhere("comment.communication_id = :communicationId", {
        communicationId: params.communication_id,
      });
    } else {
      query.andWhere("comment.communication_id IS NULL");
    }

    if (params.cursor) {
      query.andWhere("comment.Id < :cursor", { cursor: params.cursor });
    }

    query.take(params.limit || 20);
    query.orderBy("comment.Id", "DESC");

    const [comment, count] = await query.getManyAndCount();

    return { comment, count }
  }
}