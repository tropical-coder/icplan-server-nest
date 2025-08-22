import Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { appEnv } from '@app/common/helpers/env.helper';
import helmet from 'helmet';
import express from 'express';
import lusca from 'lusca';

// Sentry.init should be called before any other imports
Sentry.init({
  dsn: appEnv(
    'SENTRY_DSN',
    'https://48da211d2390401b8e2a375669f5770c@o1037967.ingest.sentry.io/6006769'
  ),
  integrations: [
    // enable HTTP calls tracing
    Sentry.httpIntegration(),
    Sentry.requestDataIntegration({
      include: {
        data: true,
      headers: true,
        query_string: true, 
        url: true,
      }
    }),
    Sentry.consoleIntegration(),
    Sentry.postgresIntegration(),
    nodeProfilingIntegration(),
  ],
  environment: appEnv('ENVIRONMENT', 'develop'),

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: appEnv('SENTRY_SAMPLE_RATE', 0.05),
  beforeBreadcrumb(breadcrumb, hint) {
    if (breadcrumb.category === 'console') {
      delete breadcrumb.data;
    }
    return breadcrumb;
  },

  beforeSend(event, hint) {
    function addAxiosContextRecursive(event: Sentry.ErrorEvent, error: unknown) {
      if (axios.isAxiosError(error)) {
        addAxiosContext(event, error);
      } else if (error instanceof Error && error.cause) {
        addAxiosContextRecursive(event, error.cause);
      }
    }

    function addAxiosContext(event: Sentry.ErrorEvent, error: AxiosError) {
      if (error.response) {
        const contexts = { ...event.contexts };
        contexts.Axios = { ...error.response };
        event.contexts = contexts;
      }
    }

    addAxiosContextRecursive(event, hint?.originalException);
    return event;
  }
});


import { NestFactory } from '@nestjs/core';
import { ValidationPipe, LogLevel } from '@nestjs/common';
import InitializeSwagger from './documentation.helper';
import morgan from 'morgan';
import axios, { AxiosError } from 'axios';
import { NestExpressApplication } from '@nestjs/platform-express';

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
  const app = await NestFactory.create<NestExpressApplication>(config.appModule, {
    logger: config.loggerLevels
  });

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));
  app.use(lusca.xframe("SAMEORIGIN"));
  app.use(lusca.xssProtection(true));
  app.use(morgan('dev'));
  app.setGlobalPrefix(config.globalPrefix || 'api');

  app.disable('x-powered-by');

  // store entity_id in res.locals to be used in action log middleware
  app.use((req, res, next) => {
    const oldJson = res.json;
    res.json = (body) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method))
        res.locals.entity_id = body.data?.Id;
      return oldJson.call(res, body);
    };
    next();
  });


  // Conditional Swagger
  if (appEnv('API_DOC_ENABLED', false)) {
    InitializeSwagger(app);
  }

  const server = app.getHttpServer();
  server.keepAliveTimeout = 30000; // 30 seconds
  server.headersTimeout = 35000; // 35 seconds

  return app;
}

/**
 * Starts the application and sets up common event handlers
 */
export async function startApp(app: any, config: AppBootstrapConfig) {  
  await app.listen(config.port, async () => {
    console.log(
      '%s app is running at http://localhost:%d',
      config.appName,
      config.port,
    );
    console.log('Press CTRL-C to stop\n');
  });

  // Common error handling
  process.on('unhandledRejection', (error) => {
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
