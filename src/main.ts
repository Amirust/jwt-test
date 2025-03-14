import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule, new FastifyAdapter()
  );

  const configService = app.get<ConfigService>(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(configService.getOrThrow('APP_PORT'), '0.0.0.0').then(() =>
    console.log('Server is running on port 3000')
  );
}
bootstrap();
