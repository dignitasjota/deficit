import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap(): Promise<void> {
  // `rawBody: true` mantiene `req.rawBody` disponible (Buffer del body
  // tal cual llegó). Lo usa el endpoint de webhooks Stripe para
  // verificar la firma con `Stripe.webhooks.constructEvent`.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  app.useLogger(app.get(Logger));

  const config = app.get(AppConfigService);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Cada endpoint usa `ZodValidationPipe` por @Body/@Query con su
  // schema. No necesitamos el `ValidationPipe` global (que requeriría
  // `class-validator` + `class-transformer` solo para mantener la
  // compatibilidad histórica con DTOs decorados).

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Déficit API')
      .setDescription('API REST del sistema RPG de pérdida de peso')
      .setVersion('0.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(config.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${config.port}`);
}

void bootstrap();
