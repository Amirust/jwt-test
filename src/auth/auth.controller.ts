import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ObjectToSignDTO } from '../dto/ObjectToSignDTO';
import { VerifyUserReplyDTO } from '../dto/VerifyUserReplyDTO';
import { ErrorCode } from '@app/common/ErrorCode.enum';
import { FastifyReply, FastifyRequest } from 'fastify';
import { COOKIE_EXPIRES_IN } from '@app/common/constants';

@Controller('auth')
export class AuthController {
  // Массив кошельков которые создали токен, чтобы не создавать базу данных
  public userWallets: string[] = [];

  constructor(
    private readonly auth: AuthService
  ) {}

  @Get('payload')
  getPayload(): ObjectToSignDTO {
    return this.auth.generatePayloadToSign();
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifySignature(@Body() payload: VerifyUserReplyDTO, @Res() reply: FastifyReply) {
    const isVerified = this.auth.verifySignedPayload(
      payload.notSignedData,
      payload.signedData,
      payload.publicKey
    );

    if (!isVerified)
      throw new BadRequestException({
        code: ErrorCode.INVALID_SIGNATURE,
        message: 'Cannot verify signature'
      });

    const wallet = this.auth.getUserWalletByPublicKey(payload.publicKey);
    this.userWallets.push(wallet);

    const userToken = this.auth.generateToken({
      wallet,
    })

    reply.setCookie('token', userToken, {
      expires: new Date(Date.now() + COOKIE_EXPIRES_IN), // Берем из констант кол-во миллисекунд и прибавляем к текущему времени
    });
    return reply.send(); // Просто ретурн не работает
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const oldToken = request.cookies?.token;

    if (!oldToken)
      throw new BadRequestException({
        code: ErrorCode.INVALID_TOKEN,
        message: 'Token is not provided'
      });

    const decoded = this.auth.decodeToken(oldToken);

    if (!this.userWallets.includes(decoded.wallet))
      throw new NotFoundException({
        code: ErrorCode.USER_NOT_FOUND,
        message: 'User not found'
      });

    const newToken = this.auth.generateToken({
      wallet: decoded.wallet
    });

    reply.setCookie('token', newToken, {
      expires: new Date(Date.now() + COOKIE_EXPIRES_IN),
    });
    return reply.send(); // Просто ретурн не работает
  }
}
