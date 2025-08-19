import { Module } from '@nestjs/common';
import { PhaseService } from './phase.service';

@Module({
  providers: [PhaseService],
  exports: [PhaseService],
})
export class PhaseModule {}
