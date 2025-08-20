import { Module } from '@nestjs/common';
import { SavedFilterService } from './saved_filter.service';

@Module({
  providers: [SavedFilterService],
  exports: [SavedFilterService],
})
export class SavedFilterModule {}
