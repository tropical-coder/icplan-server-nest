import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { ColorModel } from "../../model/color/ColorModel";
import { ColorSearchRequest } from "../../../api/controller/color/ColorRequest";

@Injectable()
export class ColorRepository extends BaseRepository<ColorModel> {
  constructor(
    @InjectRepository(ColorModel)
    private colorModelRepository: Repository<ColorModel>,
  ) {
    super(colorModelRepository);
  }

  public async SearchColor(data: ColorSearchRequest, companyId: number) {
    const colors = await this.Repository.createQueryBuilder("color")
      .where(`color.label LIKE :search`, { search: `%${data.label}%` })
      .andWhere(`color.company_id = :companyId`, { companyId })
      .getMany();

    return colors;
  }
}
