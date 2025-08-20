
import { KeyMessagesRepository } from "../../repository/company/KeyMessagesRepository";
import { IRedisUserModel } from "../../model/user/UserModel";
import { CompanyRepository } from "../../repository/company/CompanyRepository";
import { CompanyModel } from "../../model/company/CompanyModel";
import { BadRequestException } from "routing-controllers";
import { KeyMessagesModel } from "../../model/company/KeyMessagesModel";
import { UserRepository } from "../../repository/user/UserRepository";
import { SubscriptionService } from "../subscription/SubscriptionService";
import { SubscriptionRepository } from "../../repository/subscription/SubscriptionRepository";
import { KeyMessaging } from "../../../admin/controller/subscription/SubscriptionRequest";
import { IsNull } from "typeorm";
import { GetKMRequest, UpdateKMRequest } from "../../../api/controller/key_messages/KeyMessagesRequest";

@Injectable()
export class KeyMessagesService {
  constructor(
    private keyMessagesRepository: KeyMessagesRepository,
    private companyRepository: CompanyRepository,
    private userRepository: UserRepository,
    private subscriptionRepository: SubscriptionRepository
  ) {}

  private async UpdateBasicKM(data: UpdateKMRequest, user: IRedisUserModel) {
    let km = await this.keyMessagesRepository.FindOne({
      company_id: user.company_id,
      date: IsNull(),
    });

    if (!km) {
      km = new KeyMessagesModel();
      km.company_id = user.company_id;
      km.date = null;
      km.created_by = user.Id;
    }
    const isKMChanged = data.key_messages && data.key_messages !== km.key_messages;
    km.key_messages = data.key_messages || "";
    km.updated_by = user.Id;

    let updateUserPromise;
    if (isKMChanged) {
      updateUserPromise = this.userRepository.Update(
        { company_id: user.company_id },
        { key_messages_read: false },
      );
    }

    const kmPromise = this.keyMessagesRepository.Save(km);

    [km] = await Promise.all([kmPromise, updateUserPromise]);

    return km;
  }

  private async UpdateAdvancedKM(data: UpdateKMRequest, user: IRedisUserModel) {
    if (!data.date) {
      throw new BadRequestException("Date is required for updating advanced key messages.");
    }

    let km = await this.keyMessagesRepository.FindOne({
      company_id: user.company_id,
      date: data.date,
    });

    if (!km) {
      km = new KeyMessagesModel();
      km.company_id = user.company_id;
      km.date = data.date;
      km.created_by = user.Id;
    }
    km.key_messages = data.key_messages || "";
    km.updated_by = user.Id;
    km = await this.keyMessagesRepository.Save(km);

    return km;
  }

  public async UpdateKeyMessage(
    data: UpdateKMRequest,
    user: IRedisUserModel
  ) {
    const { features } = await this.subscriptionRepository.FindOne({
      company_id: user.company_id,
    });

    if (features.key_messaging == KeyMessaging.Basic) {
      return this.UpdateBasicKM(data, user);
    }

    return this.UpdateAdvancedKM(data, user);
  }

  public async GetKeyMessages(
    data: GetKMRequest,
    user: IRedisUserModel
  ): Promise<{ key_messages: KeyMessagesModel[]; count: number }> {
    const { features } = await this.subscriptionRepository.FindOne({
      company_id: user.company_id,
    });

    const keyMessages = await this.keyMessagesRepository.GetKeyMessagesHistory(
      data,
      features.key_messaging,
      user
    );

    return keyMessages;
  }

  public async DeleteKeyMessage(kmId: number, user: IRedisUserModel) {
    const km = await this.keyMessagesRepository.FindOne({
      Id: kmId,
      company_id: user.company_id,
    });

    if (!km) {
      throw new BadRequestException("Key message not found");
    }

    await this.keyMessagesRepository.Delete(
      { Id: kmId },
      false
    );

    return true;
  }

  public async GetNearestKeyMessage(
    user: IRedisUserModel
  ): Promise<KeyMessagesModel | null> {
    const nearestKM = await this.keyMessagesRepository.GetNearestKeyMessage(
      user,
    );

    return nearestKM;
  }
}
