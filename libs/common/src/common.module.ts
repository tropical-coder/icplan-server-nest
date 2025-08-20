import { Module } from '@nestjs/common';
import { RedisService } from './services/redis.service';
import { ActiveCampaignService } from './services/active-campaign.service';
import { MailService } from './services/mail.service';

@Module({
  providers: [RedisService, ActiveCampaignService, MailService],
  exports: [RedisService, ActiveCampaignService, MailService],
})
export class CommonModule {}
