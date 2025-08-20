import { Module } from '@nestjs/common';
import { KeyMessagesService } from './key_messages.service';

@Module({
  providers: [KeyMessagesService],
  exports: [KeyMessagesService],
})
export class KeyMessagesModule {}
