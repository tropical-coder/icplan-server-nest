import { BadRequestException } from "routing-controllers";
import { ContentTypeRepository } from "../../repository/content_type/ContentTypeRepository";

import { ContentTypeModel } from "../../model/content_type/ContentTypeModel";
import {
  CreateContentTypeRequest,
  UpdateContentTypeRequest,
  ContentTypeSearchRequest,
  UpdateContentTypesRequest,
} from "../../../api/controller/content_type/ContentTypeRequest";
import { PaginationParam } from "../../controller/base/BaseRequest";
import { In } from "typeorm";
import { IRedisUserModel } from "../../model/user/UserModel";

@Injectable()
export class ContentTypeService {
  constructor(private contentTypeRepository: ContentTypeRepository) {}

  public async fetchContentType(
    contentTypeIds: Array<number>,
    companyId: number,
    select?: Array<string>
  ) {
    let content_typePromise: Promise<ContentTypeModel[]> = new Promise(
      (resolve) => {
        resolve([]);
      }
    );

    if (contentTypeIds && contentTypeIds.length > 0) {
      content_typePromise = this.contentTypeRepository.Find(
        {
          Id: In(contentTypeIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return content_typePromise;
  }

  public async CreateContentType(
    data: CreateContentTypeRequest,
    user: IRedisUserModel
  ): Promise<ContentTypeModel> {
    let contentTypeExists = await this.contentTypeRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (contentTypeExists) {
      throw new BadRequestException("This Content Type name already exists.");
    }

    let contentTypeModel = new ContentTypeModel();
    contentTypeModel.company_id = user.company_id;
    contentTypeModel.name = data.name;

    const contentType = await this.contentTypeRepository.Create(
      contentTypeModel
    );
    return contentType;
  }

  public async UpdateContentType(
    contentTypeId,
    data: UpdateContentTypeRequest,
    user: IRedisUserModel
  ) {
    let contentType = await this.contentTypeRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (contentType.length) {
      if (contentType.find((ct) => ct.Id != contentTypeId)) {
        throw new BadRequestException("This Content Type already exists.");
      }
    }

    let contentTypeModel: ContentTypeModel =
      await this.contentTypeRepository.FindOne({
        Id: contentTypeId,
      });

    if (!contentTypeModel) {
      throw new BadRequestException("Not Found");
    }

    contentTypeModel.name = data.name || contentTypeModel.name;
    await this.contentTypeRepository.Save(contentTypeModel);

    return { content_type: contentTypeModel };
  }

  public async DeleteContentType(contentTypeId: number) {
    await this.contentTypeRepository.DeleteById(contentTypeId, false);
    return null;
  }

  public async UpdateContentTypes(data: UpdateContentTypesRequest) {
    let contentTypes = [];
    for (let index = 0, len = data.content_types.length; index < len; index++) {
      let contentTypeModel: ContentTypeModel =
        await this.contentTypeRepository.FindOne({
          Id: data.content_types[index].Id,
        });
      if (!contentTypeModel) {
        continue;
      }
      contentTypeModel.name = data.content_types[index].name
        ? data.content_types[index].name
        : contentTypeModel.name;
      await this.contentTypeRepository.Save(contentTypeModel);
      contentTypes.push(contentTypeModel);
    }

    return { content_types: contentTypes };
  }

  public async GetContentType(
    contentTypeId: number
  ): Promise<ContentTypeModel> {
    return await this.contentTypeRepository.FindById(contentTypeId);
  }

  public async GetContentTypes(
    data: PaginationParam,
    user: IRedisUserModel
  ): Promise<{
    content_types: number | any[];
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const [contentTypes, count] =
      await this.contentTypeRepository.GetContentTypes(data, user.company_id);
    return {
      content_types: contentTypes,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchContentTypes(
    data: ContentTypeSearchRequest,
    user: IRedisUserModel
  ): Promise<{
    content_types: Array<ContentTypeModel>;
    page: number;
    limit: number;
  }> {
    const contentTypes = await this.contentTypeRepository.SearchContentType(
      data,
      user.company_id
    );
    return { content_types: contentTypes, page: data.page, limit: data.limit };
  }

  public async GetContentTypeCount(data, user: IRedisUserModel) {
    const contentTypeCount =
      await this.contentTypeRepository.GetContentTypeCount(data, user);
    return contentTypeCount;
  }

  public async GetMostActiveContentType(data, user: IRedisUserModel) {
    const contentType =
      await this.contentTypeRepository.GetMostActiveContentType(data, user);
    return contentType;
  }

  public async GetMostActiveContentTypeV2(data, user: IRedisUserModel) {
    const contentType =
      await this.contentTypeRepository.GetMostActiveContentTypeV2(data, user);
    return contentType;
  }

  public async GetContentTypeByCommunicationId(communicationId: number, select?: Array<string>) {
    return await this.contentTypeRepository.GetContentTypeByCommunicationId(
      communicationId,
      select,
    );
  }
}
