import { Module } from '@nestjs/common';
import { StrategicPriorityService } from './strategic_priority.service';

@Module({
  providers: [StrategicPriorityService],
  exports: [StrategicPriorityService],
})
export class StrategicPriorityModule {}
