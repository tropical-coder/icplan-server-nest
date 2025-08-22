import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationModel } from './entities/communication.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommunicationModel])],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
