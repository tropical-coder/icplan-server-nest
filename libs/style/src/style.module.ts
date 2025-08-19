import { Module } from '@nestjs/common';
import { StyleService } from './style.service';

@Module({
  providers: [StyleService],
  exports: [StyleService],
})
export class StyleModule {}
