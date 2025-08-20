import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { GetStylesRequest } from "../../../admin/controller/style/StyleRequest";
import { StyleModel } from "../../model/style/StyleModel";
import { BaseRepository } from "@app/common/base/base.repository";

export class StyleRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(StyleModel)
    private styleModelRepository: Repository<StyleModel>,
  ) {
    super([^Repository);
  }

  public async GetStyles(data: GetStylesRequest) {
    return await this.Repository.query(`
      SELECT s.*, ARRAY_AGG(cul.company_id) as company_ids
      FROM "style" s
      LEFT JOIN company_user_license cul
        ON cul.settings->'subdomains' ? s.subdomain
      ${data.subdomain ? `WHERE s.subdomain ILIKE '%${data.subdomain}%'` : ""}
      GROUP BY s."Id"
      ${data.company_id ? `HAVING ${data.company_id} = ANY(ARRAY_AGG(cul.company_id))` : ``};
    `);
  }
}
