import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { SubscriptionModel } from "@app/subscription/entities/subscription.entity";

@Injectable()
export class SubscriptionRepository extends BaseRepository<SubscriptionModel> {
  constructor(
    @InjectRepository(SubscriptionModel)
    private subscriptionRepository: Repository<SubscriptionModel>,
  ) {
    super(subscriptionRepository);
  }
}
