import { Body, CurrentUser, Delete, Get, JsonController, Param, Post, Put, QueryParams, Res } from "routing-controllers";

import { CommentService } from "../../../app/service/comment/CommentService";
import { AddCommentRequest, GetCommentsRequest, UpdateCommentRequest } from "./CommentRequest";
import { IRedisUserModel } from "../../../app/model/user/UserModel";
import { Response } from "express";
import { Authorized } from "../../../app/decorator/Authorized";

@ApiTags()
@Controller()
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Authorized()
  @Get("/comment")
  async GetComments(
    @Query() params: GetCommentsRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response
  ) {
    const comments = await this.commentService.GetComments(params, user);

    return comments;
  }

  @Authorized()
  @Post("/comment")
  async AddComment(
    @Body() data: AddCommentRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    let comment;
    if (data.communication_id) {
      comment = await this.commentService.AddCommunicationComment(data, user);
    } else {
      comment = await this.commentService.AddPlanComment(data, user);
    }

    return comment;
  }

  @Authorized()
  @Put("/comment/:commentId([0-9]+)")
  async UpdateComment(
    @Param("commentId") commentId: number,
    @Body() data: UpdateCommentRequest,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    const comment = await this.commentService.UpdateComment(commentId, data, user);

    return comment;
  }

  @Authorized()
  @Delete("/comment/:commentId([0-9]+)")
  async DeleteComment(
    @Param("commentId") commentId: number,
    @CurrentUser()
    user: IRedisUserModel,
    @Res() res: Response,
  ) {
    await this.commentService.DeleteComment(commentId, user);

    return true;
  }
}
