import { Module } from '@nestjs/common';
import { AdministratorController } from './controllers/administrator/administrator.controller';
import { DatabaseModule } from '@app/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AdministratorModule } from '@app/administrator';
import { CommonModule } from '@app/common';
import { UserModule } from '@app/user';
import { CompanyModule } from '@app/company';
import { PlanModule } from '@app/plan';
import { BusinessAreaModule } from '@app/business_area';
import { SubscriptionModule } from '@app/subscription';
import { PackageModule } from '@app/package';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AdministratorModule,
    CommonModule,
    UserModule,
    CompanyModule,
    PlanModule,
    BusinessAreaModule,
    SubscriptionModule,
    PackageModule,
  ],
  controllers: [],
})
export class AppModule {}