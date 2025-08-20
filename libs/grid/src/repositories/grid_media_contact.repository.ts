import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { GridMediaContactModel, GridMediaLocations } from "../entities/grid_media_contact.entity";

@Injectable()
export class GridMediaContactRepository extends BaseRepository<GridMediaContactModel> {
  constructor(
    @InjectRepository(GridMediaContactModel)
    private gridMediaContactModelRepository: Repository<GridMediaContactModel>,
  ) {
    super(gridMediaContactModelRepository);
  }

  public async GetGridMediaContacts(companyId: number) {
    const mediaLocations = Object.values(GridMediaLocations);

    let gridMediaContacts = await this.Repository.createQueryBuilder(
      "grid_media_contact"
    )
      .select([
        "grid_media_contact",
        "user.Id",
        "user.full_name",
        "user.email",
        "user.image_url",
        "user.is_deleted",
      ])
      .where(`grid_media_contact.company_id = ${companyId}`)
      .innerJoin("grid_media_contact.user", "user")
      .orderBy(`array_position(
          ARRAY['${mediaLocations.join("','")}']::text[],
          grid_media_contact.location
        )`, 
        "ASC"
      )
      .getMany();

    return gridMediaContacts;
  }
}
