import { appEnv } from '@app/common/helpers/env.helper';
import { AppModule } from './app.module';
import { BootstrapApp } from '@app/common/helpers/bootstrap.helper';

async function bootstrap() {
  await BootstrapApp({
    appModule: AppModule,
    port: appEnv("PORT", 3000),
    appName: "API",
    loggerLevels: ["error", "warn"],
  });
}

bootstrap();
