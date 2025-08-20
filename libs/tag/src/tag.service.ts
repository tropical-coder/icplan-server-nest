import { NotificationRuleRepository } from "../../repository/notification/NotificationRuleRepository";
import { BadRequestException } from "routing-controllers";
import { TagRepository } from "../../repository/tag/TagRepository";

import { TagModel } from "../../model/tag/TagModel";
import {
  CreateTagRequest,
  UpdateTagRequest,
  TagSearchRequest,
  UpdateTagsRequest,
} from "../../../api/controller/tag/TagRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { In } from "typeorm";
import { IRedisUserModel } from "../../model/user/UserModel";
import { NotificationRuleEntity } from "../../model/notification/NotificationRuleModel";

@Injectable()
export class TagService {
  constructor(
    private tagRepository: TagRepository,
    private notificationRuleRepository: NotificationRuleRepository
  ) {}

  public async fetchTags(
    tagIds: Array<number>,
    companyId: number,
    select?: Array<string>
  ) {
    let tagPromise: Promise<TagModel[]> = new Promise((resolve) => {
      resolve([]);
    });

    if (tagIds && tagIds.length > 0) {
      tagPromise = this.tagRepository.Find(
        {
          Id: In(tagIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return tagPromise;
  }

  public async CreateTag(
    data: CreateTagRequest,
    user: IRedisUserModel
  ): Promise<TagModel> {
    let tagModel = new TagModel();
    tagModel.company_id = user.company_id;
    tagModel.name = data.name;
    const tag = await this.tagRepository.Create(tagModel);

    return tag;
  }

  public async UpdateTag(tagId: number, data: UpdateTagRequest) {
    let tagModel: TagModel = await this.tagRepository.FindOne({ Id: tagId });

    if (!tagModel) {
      throw new BadRequestException("Not Found");
    }

    tagModel.name = data.tag || tagModel.name;
    await this.tagRepository.Save(tagModel);

    return { tag: tagModel };
  }

  public async UpdateTags(data: UpdateTagsRequest) {
    let tags = [];
    for (let index = 0, len = data.tags.length; index < len; index++) {
      let tagModel: TagModel = await this.tagRepository.FindOne({
        Id: data.tags[index].Id,
      });
      if (!tagModel) {
        continue;
      }
      tagModel.name = data.tags[index].name
        ? data.tags[index].name
        : tagModel.name;
      await this.tagRepository.Save(tagModel);
      tags.push(tagModel);
    }

    return { tags: tags };
  }

  public async DeleteTag(tag_ids: number[], user) {
    await Promise.all([
      this.tagRepository.Delete(
        {
          Id: In(tag_ids),
          company_id: user.company_id,
        },
        false
      ),
      this.notificationRuleRepository.Delete({
        entity: NotificationRuleEntity.Tag,
        entity_id: In(tag_ids),
      }, false),
    ]);
    return null;
  }

  public async GetTag(tagId: number): Promise<TagModel> {
    return await this.tagRepository.FindById(tagId);
  }

  public async GetTags(
    data: PaginationParam,
    user: IRedisUserModel | any
  ): Promise<{
    tags: number | any[];
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const [tags, count] = await this.tagRepository.GetTags(
      data,
      user.company_id
    );
    return { tags: tags, count: count, page: data.page, limit: data.limit };
  }

  public async SearchTags(
    data: TagSearchRequest,
    user: IRedisUserModel
  ): Promise<{ tags: Array<TagModel>; page: number; limit: number }> {
    const tags = await this.tagRepository.SearchTag(data, user.company_id);
    return { tags: tags, page: data.page, limit: data.limit };
  }

  public async GetTagsByCommunicationId(
    communicationId: number,
    select?: Array<string>
  ): Promise<TagModel[]> {
    return await this.tagRepository.GetTagsByCommunicationId(communicationId, select);
  }
}
