import { Module } from '@nestjs/common';
import { ParentFolderService } from './parent_folder.service';

@Module({
  providers: [ParentFolderService],
  exports: [ParentFolderService],
})
export class ParentFolderModule {}
