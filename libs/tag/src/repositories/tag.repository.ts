import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { TagModel } from "../../model/tag/TagModel";
import { TagSearchRequest } from "../../../api/controller/tag/TagRequest";
import { GetPaginationOptions } from "../../helpers/UtilHelper";

@Injectable()
export class TagRepository extends BaseRepository<TagModel> {
  constructor(
    @InjectRepository(TagModel)
    private tagModelRepository: Repository<TagModel>,
  ) {
    super(tagModelRepository);
  }

  public async GetTags(data, company_id) {
    const paginationParam = GetPaginationOptions(data);
    const [tags, count] = await this.Repository.createQueryBuilder("tag")
      .where(`tag.company_id = ${company_id}`)
      .andWhere(data.name ? `tag.name ILIKE :name` : "1=1", {
        name: `%${data.name}%`,
      })
      .orderBy("tag.name")
      .skip(paginationParam.offset)
      .take(paginationParam.limit)
      .getManyAndCount();

    return [tags, count];
  }

  public async SearchTag(data: TagSearchRequest, company_id) {
    const paginationParam = GetPaginationOptions(data);
    const tag = await this.Repository.query(`
      SELECT 
        DISTINCT t."Id", t.name
      FROM 
        tag t
      WHERE 
      t.company_id = ${company_id}
        ${data.tag ? ` AND LOWER(t.name) LIKE LOWER('%${data.tag}%')` : ``}
      ORDER BY t.name ASC
      OFFSET ${paginationParam.offset} 
      LIMIT ${paginationParam.limit};
    `);

    return tag;
  }

  public async GetTagsByCommunicationId(communicationId: number, select = []) {
    select.push("tag.Id");
    return await this.Repository.createQueryBuilder("tag")
      .select(select)
      .innerJoin(
        "communication_tag",
        "communication_tag",
        "communication_tag.tag_id = tag.Id AND communication_tag.communication_id = :communicationId",
        { communicationId },
      )
      .getMany();
  }
}
