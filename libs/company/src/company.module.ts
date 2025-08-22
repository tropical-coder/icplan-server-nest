import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyUserLicenseRepository } from './repositories/company_user_license.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUserLicenseModel } from './entities/company_user_license.entity';
import { CompanyModel } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyUserLicenseModel, CompanyModel])],
  providers: [CompanyService, CompanyUserLicenseRepository],
  exports: [CompanyService, CompanyUserLicenseRepository],
})
export class CompanyModule {}
