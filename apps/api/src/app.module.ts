import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database/database.module';
import { SentryModule } from "@sentry/nestjs/setup";

@Module({
  imports: [
    DatabaseModule,
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}