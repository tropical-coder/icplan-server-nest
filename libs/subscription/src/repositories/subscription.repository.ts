import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { BaseRepository } from "@app/common/base/base.repository";
import { SubscriptionModel } from "./entities/subscription.entity";

export class SubscriptionRepository extends BaseRepository<[^> {
  constructor(
    @InjectRepository(SubscriptionModel)
    private subscriptionRepository: Repository<SubscriptionModel>,
  ) {
    super([^Repository);
  }
}
