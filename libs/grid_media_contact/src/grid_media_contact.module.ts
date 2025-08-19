import { Module } from '@nestjs/common';
import { GridMediaContactService } from './grid_media_contact.service';

@Module({
  providers: [GridMediaContactService],
  exports: [GridMediaContactService],
})
export class GridMediaContactModule {}
