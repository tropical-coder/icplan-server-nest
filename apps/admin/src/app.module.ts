import { Module } from '@nestjs/common';
import { AdministratorController } from './controllers/administrator/administrator.controller';
import { DatabaseModule } from '@app/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AdministratorModule } from '@app/administrator';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AdministratorModule,
  ],
  controllers: [AdministratorController],
})
export class AppModule {}