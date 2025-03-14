import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule, new FastifyAdapter()
  );

  const configService = app.get<ConfigService>(ConfigService);

  const logger = new Logger('Bootstrap');

  // Ставим глобал префикс чтобы запросы шли на example.com/api/...
  app.setGlobalPrefix('api');

  // Валидатор для запросов чтобы не передавали то что не нужно в боди
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.getOrThrow<string>('CORS_ORIGIN'),
    credentials: true,
  });

  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('COOKIE_SECRET'),
  });

  await app.listen(configService.getOrThrow('APP_PORT'), '0.0.0.0', () =>
    logger.log(`Server is running on port ${configService.get('APP_PORT')}`)
  )
}

void bootstrap();
