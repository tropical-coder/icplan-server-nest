import { Module } from '@nestjs/common';
import { BusinessAreaService } from './business_area.service';
import { BusinessAreaRepository } from './repositories/business_area.repository';
import { UserBusinessAreaPermissionRepository } from './repositories/user_business_area_permission.repository';
import { BusinessAreaModel } from './entities/business_area.entity';
import { UserBusinessAreaPermissionModel } from './entities/user_business_area_permission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessAreaModel, UserBusinessAreaPermissionModel]),
  ],
  providers: [BusinessAreaService, BusinessAreaRepository, UserBusinessAreaPermissionRepository],
  exports: [BusinessAreaService, BusinessAreaRepository, UserBusinessAreaPermissionRepository],
})
export class BusinessAreaModule { }
