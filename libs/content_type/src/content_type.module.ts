import { Module } from '@nestjs/common';
import { ContentTypeService } from './content_type.service';

@Module({
  providers: [ContentTypeService],
  exports: [ContentTypeService],
})
export class ContentTypeModule {}
