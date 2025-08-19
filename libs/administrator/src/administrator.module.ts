import { Module } from '@nestjs/common';
import { AdministratorService } from './administrator.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModel } from './entities/administrator.entity';
import { AdministratorRepository } from './repository/administrator.repository';
import { CommonModule } from '@app/common/common.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminModel]),
    CommonModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('SECRET'),
        };
      },
    }),
  ],
  providers: [AdministratorService, AdministratorRepository],
  exports: [AdministratorService],
})
export class AdministratorModule {}
