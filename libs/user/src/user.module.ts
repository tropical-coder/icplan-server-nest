import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserSettingRepository } from './repositories/user_setting.repository';
import { UserRepository } from './repositories/user.repository';
import { UserModel } from './entities/user.entity';
import { UserSettingModel } from './entities/user_setting.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([UserSettingModel, UserModel])],
  providers: [UserService, UserRepository, UserSettingRepository],
  exports: [UserService, UserRepository, UserSettingRepository],
})
export class UserModule {}
