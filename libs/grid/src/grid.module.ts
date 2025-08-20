import { Module } from '@nestjs/common';
import { GridService } from './grid.service';

@Module({
  providers: [GridService],
  exports: [GridService],
})
export class GridModule {}
