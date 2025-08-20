import { BadRequestException } from "routing-controllers";
import { StyleRepository } from "../../repository/style/StyleRepository";

import { StyleModel } from "../../model/style/StyleModel";
import { ILike } from "typeorm";
import { GetStylesRequest } from "../../../admin/controller/style/StyleRequest";
import { CreateStyleRequest } from "../../../admin/controller/style/StyleRequest";
import { UpdateStyleRequest } from "../../../admin/controller/style/StyleRequest";
import { appEnv } from "../../helpers/EnvHelper";
import { RedisRepository } from "../../repository/RedisRepository";

@Injectable()
export class StyleService {
  constructor(
    private styleRepository: StyleRepository,
    private redisService: RedisService,
  ) {}

  public async UpdateCache() {
    const styles = await this.styleRepository.Find({});

    const updatePromises = [];
    styles.forEach((style) => {
      updatePromises.push(this.redisService.Set(
        `css-${style.subdomain}`,
        style.css,
      ));
    });

    await Promise.all(updatePromises);
    return true;
  }

  public async GetStyles(data: GetStylesRequest) {
    const styles = await this.styleRepository.GetStyles(data);
    return styles;
  }

  public async GetStyleById(style_id: number) {
    const style = await this.styleRepository.FindById(style_id);

    if (!style) {
      throw new BadRequestException("Style not found");
    }

    return style;
  }

  public async CreateStyle(data: CreateStyleRequest) {
    data.subdomain = data.subdomain.toLowerCase();

    let style: StyleModel;
    style = await this.styleRepository.FindOne({
      subdomain: data.subdomain
    });

    if (style) {
      throw new BadRequestException(`Style for subdomain ${data.subdomain} already exists`);
    }
    
    style = new StyleModel();
    style.subdomain = data.subdomain;
    style.css = data.css.replaceAll(
      "{{STATIC_ASSET_BASE_URL}}",
      appEnv(
        "STATIC_ASSETS_BASE_URL",
        "https://dev-icplan-static-content-public.s3.eu-west-1.amazonaws.com"
      )
    );
    [style] = await Promise.all([
      this.styleRepository.Create(style),
      this.redisService.Set(`css-${style.subdomain}`, style.css),
    ]);

    return style;
  }

  public async UpdateStyle(style_id: number, data: UpdateStyleRequest) {
    data.subdomain = data.subdomain.toLowerCase();

    const style = await this.styleRepository.FindById(style_id);

    if (!style) {
      throw new BadRequestException("Style not found");
    }

    if (data.subdomain && data.subdomain != style.subdomain) {
      const duplicateStyle = await this.styleRepository.FindOne({
        subdomain: data.subdomain,
      });
      if (duplicateStyle) {
        throw new BadRequestException(`Style for subdomain ${data.subdomain} already exists`);
      }

      await this.redisService.Delete(`css-${style.subdomain}`);
      style.subdomain = data.subdomain;
    }

    style.css = data.css
      ? data.css.replaceAll(
          "{{STATIC_ASSET_BASE_URL}}",
          appEnv(
            "STATIC_ASSETS_BASE_URL",
            "https://dev-icplan-static-content-public.s3.eu-west-1.amazonaws.com"
          ),
        )
      : style.css;

    await Promise.all([
      this.styleRepository.Save(style),
      this.redisService.Set(`css-${style.subdomain}`, style.css),
    ]);
    
    return style;
  }

  public async DeleteStyle(style_id: number) {
    const style = await this.styleRepository.FindById(style_id);

    if (!style) {
      throw new BadRequestException("Style not found");
    }

    await this.styleRepository.DeleteById(style_id, false);

    // delete from cache
    this.redisService.Delete(`css-${style.subdomain}`);

    return true;
  }

  public async GetCSSBySubdomain(subdomain: string, cacheUpdated = false) {
    let css = await this.redisService.Get(`css-${subdomain}`)
    if (!css) {
      if (!cacheUpdated) {
        await this.UpdateCache();
        return await this.GetCSSBySubdomain(subdomain, true);
      } else {
        // If after updating cache, still not found, get default css
        css = await this.redisService.Get("css-default");
      }
    }

    return css;
  }
}