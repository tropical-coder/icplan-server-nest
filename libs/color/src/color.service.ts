import { BadRequestException } from "routing-controllers";
import { ColorRepository } from "../../repository/color/ColorRepository";

import { ColorModel } from "../../model/color/ColorModel";
import { IRedisUserModel } from "../../model/user/UserModel";
import {
  ColorSearchRequest,
  CreateColorRequest,
  UpdateColorRequest,
} from "../../../api/controller/color/ColorRequest";

@Injectable()
export class ColorService {
  constructor(private colorRepository: ColorRepository) {}

  public async CreateDefaultColor(companyId: number) {
    let colorModel = new ColorModel();
    colorModel.company_id = companyId;
    colorModel.color = "#445CB4";
    colorModel.label = "Default";

    this.colorRepository.Create(colorModel);

    return;
  }

  public async CreateColor(
    data: CreateColorRequest,
    user: IRedisUserModel
  ): Promise<ColorModel> {
    let colorExists = await this.colorRepository.FindOne({
      color: data.color,
      company_id: user.company_id,
    });

    if (colorExists) {
      throw new BadRequestException("This Color already exists.");
    }

    let colorModel = new ColorModel();
    colorModel.company_id = user.company_id;
    colorModel.color = data.color;
    colorModel.label = data.label ? data.label : "";

    const color = await this.colorRepository.Create(colorModel);
    return color;
  }

  public async UpdateColor(
    colorId,
    data: UpdateColorRequest,
    user: IRedisUserModel
  ) {
    let colorModel: ColorModel = await this.colorRepository.FindOne({
      Id: colorId,
      company_id: user.company_id,
    });

    if (!colorModel) {
      throw new BadRequestException("Not Found");
    }

    colorModel.color = data.color;
    colorModel.label = data.label ? data.label : "";
    await this.colorRepository.Save(colorModel);

    return { color: colorModel };
  }

  public async DeleteColor(colorId: number, user: IRedisUserModel) {
    const count = await this.colorRepository.Count({ company_id: user.company_id });

    if (count == 1) {
      throw new BadRequestException("Company must have atleast one color.");
    }
    await this.colorRepository.DeleteById(colorId, false);
    return null;
  }

  public async GetColors(user: IRedisUserModel): Promise<ColorModel[]> {
    const colors = await this.colorRepository.Find({
      company_id: user.company_id,
    });
    return colors;
  }

  public async SearchColors(
    data: ColorSearchRequest,
    user: IRedisUserModel
  ): Promise<ColorModel[]> {
    const colors = await this.colorRepository.SearchColor(
      data,
      user.company_id
    );
    return colors;
  }
}
