import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export default function InitializeSwagger(app) {
  const config = new DocumentBuilder()
    .setTitle('ICPlan API Documentation')
    .setVersion('0.1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      description: 'Api authentication token',
      name: 'AUTHORIZATION',
      in: 'header',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config, { 
    operationIdFactory: (controllerKey: string, methodKey: string) => {
      // Convert pascal case to space separated words
      return methodKey.replace(/([A-Z])/g, ' $1').trim();
    },
  });
  SwaggerModule.setup('/api/api-docs', app, document, {
    explorer: true,
    swaggerOptions: {
      defaultModelRendering: 'model', // Render model instead of example
      displayOperationId: true // Display controller method name
    },
    customCss: `
      .swagger-ui .opblock .opblock-summary-path-description-wrapper {
        width: auto
      }
      .opblock-summary-operation-id {
        color: #888 !important;
      }`,
  });
}
