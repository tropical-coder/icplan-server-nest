import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity_log.service';

@Module({
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
