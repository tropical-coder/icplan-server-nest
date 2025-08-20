import { NotificationRuleRepository } from "../../repository/notification/NotificationRuleRepository";
import { BadRequestException } from "routing-controllers";
import { ChannelRepository } from "../../repository/channel/ChannelRepository";

import { ChannelModel } from "../../model/channel/ChannelModel";
import { BusinessAreaRepository } from "../../repository/business_area/BusinessAreaRepository";
import {
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelSearchRequest,
  UpdateChannelsRequest,
  GetChannelRequest,
  UpdateChannelStatusRequest,
} from "../../../api/controller/channel/ChannelRequest";
import { In } from "typeorm";
import { IRedisUserModel } from "../../model/user/UserModel";
import { NotificationRuleEntity } from "../../model/notification/NotificationRuleModel";
import { CompanySettingsService } from "../company/CompanySettingsService";

@Injectable()
export class ChannelService {
  constructor(
    private channelRepository: ChannelRepository,
    private businessAreaRepository: BusinessAreaRepository,
    private notificationRuleRepository: NotificationRuleRepository,
    private companySettingsService: CompanySettingsService,
  ) {}

  public async fetchChannels(
    channelIds: Array<number>,
    companyId: number,
    select?: Array<string>
  ) {
    let channelPromise: Promise<ChannelModel[]> = new Promise((resolve) => {
      resolve([]);
    });

    if (channelIds && channelIds.length > 0) {
      channelPromise = this.channelRepository.Find(
        {
          Id: In(channelIds),
          company_id: companyId,
        },
        null,
        select
      );
    }

    return channelPromise;
  }

  public async GetChannelByBusinessArea(
    businessAreasIds: Array<number>,
    channelIds: Array<number>,
    companyId: number
  ) {
    let businessAreas = await this.businessAreaRepository.GetAncestors(
      { business_areas: businessAreasIds },
    );
    businessAreasIds = businessAreas.map(({ Id }) => Id);

    businessAreas = await this.businessAreaRepository.GetAllBusinessAreaLevels(
      businessAreasIds,
      companyId
    );
    businessAreasIds = businessAreas.map(({ Id }) => Id);

    const channels = await this.channelRepository.GetChannelByBusinessArea(
      businessAreasIds,
      channelIds,
      companyId
    );

    return channels;
  }

  public async CreateChannel(
    data: CreateChannelRequest,
    user: IRedisUserModel
  ): Promise<ChannelModel> {
    let channelExists = await this.channelRepository.FindOne({
      name: data.name,
      company_id: user.company_id,
    });

    if (channelExists) {
      throw new BadRequestException("This Channel name already exists.");
    }

    let channelModel = new ChannelModel();
    channelModel.company_id = user.company_id;
    channelModel.name = data.name;
    channelModel.description = data.description;
    channelModel.business_areas = await this.businessAreaRepository.FindByIds(
      data.business_areas
    );

    const channel = await this.channelRepository.Create(channelModel);

    this.companySettingsService.CheckCompanySettingsCompleted(user.company_id);
    return channel;
  }

  public async UpdateChannel(
    channelId: number,
    data: UpdateChannelRequest,
    user: IRedisUserModel
  ) {
    let channels = await this.channelRepository.Find({
      name: data.name,
      company_id: user.company_id,
    });

    if (channels.length) {
      if (channels.find((ch) => ch.Id != channelId)) {
        throw new BadRequestException("This Channel already exists.");
      }
    }

    let channelModel: ChannelModel = await this.channelRepository.FindOne({
      Id: channelId,
    });

    if (!channelModel) {
      throw new BadRequestException("Not Found");
    }

    const businessAreaPromise = this.businessAreaRepository.FindByIds(
      data.business_areas
    );
    channelModel.name = data.name || channelModel.name;
    channelModel.description = data.description ?? channelModel.description;
    channelModel.business_areas = [];
    await this.channelRepository.Save(channelModel);

    channelModel.business_areas = await businessAreaPromise;
    await this.channelRepository.Save(channelModel);

    return { channel: channelModel };
  }

  public async UpdateChannels(data: UpdateChannelsRequest) {
    let channels = [];
    for (let index = 0, len = data.channels.length; index < len; index++) {
      let channelModel: ChannelModel = await this.channelRepository.FindOne({
        Id: data.channels[index].Id,
      });
      if (!channelModel) {
        continue;
      }
      channelModel.name = data.channels[index].name
        ? data.channels[index].name
        : channelModel.name;
      channelModel.description = data.channels[index].description
        ? data.channels[index].description
        : channelModel.description;
      await this.channelRepository.Save(channelModel);
      channels.push(channelModel);
    }

    return { channels: channels };
  }

  public async DeleteChannel(channelIds: number[], user: IRedisUserModel) {
    await Promise.all([
      this.channelRepository.Delete(
        {
          Id: In(channelIds),
          company_id: user.company_id,
        },
        false
      ),
      this.notificationRuleRepository.Delete(
        {
          entity_id: In(channelIds),
          entity: NotificationRuleEntity.Channel,
        },
        false
      ),
    ]);
    return null;
  }

  public async GetChannel(channelId: number): Promise<ChannelModel> {
    return await this.channelRepository.FindById(channelId, ["business_areas"]);
  }

  public async GetChannels(
    data: GetChannelRequest,
    user: IRedisUserModel
  ): Promise<{
    channels: Array<ChannelModel>;
    count: number | any[];
    page: number;
    limit: number;
  }> {
    const { channels, count } = await this.channelRepository.GetChannel(
      data,
      user
    );
    return {
      channels: channels,
      count: count,
      page: data.page,
      limit: data.limit,
    };
  }

  public async SearchChannels(
    data: ChannelSearchRequest,
    user: IRedisUserModel
  ): Promise<{ channels: Array<ChannelModel>; page: number; limit: number }> {
    if (data.business_areas) {
      const businessAreas = await this.businessAreaRepository.GetAncestors(data);
      data.business_areas = businessAreas.map(({ Id }) => Id);
    }
    const channels = await this.channelRepository.SearchChannel(
      data,
      user.company_id
    );
    return { channels: channels, page: data.page, limit: data.limit };
  }

  public async GetChannelCount(data, user: IRedisUserModel) {
    const channelCount = await this.channelRepository.GetChannelCount(
      data,
      user
    );
    return channelCount;
  }

  public async GetMostActiveChannels(data, user: IRedisUserModel) {
    const channel = await this.channelRepository.GetMostActiveChannels(
      data,
      user
    );
    return channel;
  }

  public async GetMostActiveChannelsV2(data, user: IRedisUserModel) {
    const channel = await this.channelRepository.GetMostActiveChannelsV2(
      data,
      user
    );
    return channel;
  }

  public async UpdateChannelStatus(
    channelId: number,
    data: UpdateChannelStatusRequest,
    user: IRedisUserModel
  ) {
    const channel = await this.channelRepository.FindOne({
      Id: channelId,
      company_id: user.company_id,
    });

    if (!channel) {
      throw new BadRequestException("Not Found");
    }

    channel.is_archive = data.is_archive;
    await this.channelRepository.Save(channel);

    return channel;
  }

  public async GetChannelByCommunicationId(communicationId: number, select?: Array<string>) {
    return await this.channelRepository.GetChannelByCommunicationId(
      communicationId,
      select
    );
  }
}
