import { NestFactory } from '@nestjs/core';
import { ValidationPipe, LogLevel } from '@nestjs/common';
import { appEnv } from './env.helper';
import InitializeSwagger from './documentation.helper';
import morgan from 'morgan';

export interface AppBootstrapConfig {
  /** The main application module */
  appModule: any;
  /** Port environment variable name */
  port: number;
  /** Application name for console messages */
  appName: string;
  /** Logger levels to enable */
  loggerLevels: LogLevel[];
  /** Global prefix for routes (default: 'api') */
  globalPrefix?: string;
}

/**
 * Creates and configures a NestJS application with common setup
 */
export async function createBootstrappedApp(config: AppBootstrapConfig) {
  const app = await NestFactory.create(config.appModule, {
    logger: config.loggerLevels
  });

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  app.use(morgan('dev'));
  app.setGlobalPrefix(config.globalPrefix || 'api');

  // Conditional Swagger
  if (appEnv("API_DOC_ENABLED", false)) {
    InitializeSwagger(app);
  }

  return app;
}

/**
 * Starts the application and sets up common event handlers
 */
export async function startApp(app: any, config: AppBootstrapConfig) {  
  await app.listen(config.port, async () => {
    console.log(
      "%s app is running at http://localhost:%d",
      config.appName,
      config.port,
    );
    console.log("Press CTRL-C to stop\n");
  });

  // Common error handling
  process.on("unhandledRejection", (error) => {
    console.log(error);
  });
}

/**
 * Complete bootstrap function that creates and starts the app
 */
export async function BootstrapApp(config: AppBootstrapConfig) {
  const app = await createBootstrappedApp(config);
  await startApp(app, config);
  return app;
}
