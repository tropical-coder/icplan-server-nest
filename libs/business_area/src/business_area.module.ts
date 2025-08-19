import { Module } from '@nestjs/common';
import { BusinessAreaService } from './business_area.service';

@Module({
  providers: [BusinessAreaService],
  exports: [BusinessAreaService],
})
export class BusinessAreaModule {}
