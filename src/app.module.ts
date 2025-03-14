import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { ConfigModule } from '@nestjs/config';
import { ResponseModule } from '@app/response';

@Module({
  imports: [
    ResponseModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [ AppController, AuthController ],
  providers: [ AppService, AuthService ],
})
export class AppModule {}
