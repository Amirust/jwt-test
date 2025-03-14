import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VerifyUserReplyDTO } from '../dto/VerifyUserReplyDTO';
import { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ErrorCodeEnum } from '@app/common/error-code.enum';
import { ethers } from 'ethers';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: randomBytes(32).toString('hex'),
          signOptions: { expiresIn: '60s' },
        }),
      ],
      controllers: [ AuthController ],
      providers: [ AuthService ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('returns payload to sign', () => {
    const result = controller.getPayload();

    expect(result).toBeDefined();
    expect(result.bytes).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it('verifies signature and sets cookie on success', async () => {
    const publicKey = wallet.publicKey;
    const notSignedData = { bytes: 'test', timestamp: 123456 };
    const signedData = await wallet.signMessage(ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(notSignedData))));
    const payload: VerifyUserReplyDTO = { notSignedData, signedData, publicKey };
    const reply = { setCookie: jest.fn(), send: jest.fn() } as unknown as FastifyReply;

    controller.verifySignature(payload, reply);

    expect(reply.setCookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
  });

  it('throws BadRequestException for invalid signature', () => {
    const payload: VerifyUserReplyDTO = {
      notSignedData: { bytes: 'test', timestamp: 123456 },
      signedData: 'invalidSignedMessage',
      publicKey: 'publicKey',
    };
    const reply = { send: jest.fn() } as unknown as FastifyReply;

    jest.spyOn(authService, 'verifySignedPayload').mockReturnValue(false);

    expect(() => controller.verifySignature(payload, reply)).toThrow(
      new BadRequestException({
        code: ErrorCodeEnum.INVALID_SIGNATURE,
        message: 'Cannot verify signature',
      }),
    );
  });

  it('refreshes token and sets new cookie on success', () => {
    const oldToken = authService.generateToken({ wallet: wallet.address });
    const request = { cookies: { token: oldToken } } as unknown as FastifyRequest;
    const reply = { setCookie: jest.fn(), send: jest.fn() } as unknown as FastifyReply;

    controller.refreshToken(request, reply);

    expect(reply.setCookie).toHaveBeenCalledWith('token', expect.any(String), expect.any(Object));
  });

  it('throws BadRequestException if token is not provided', () => {
    const request = { cookies: {} } as FastifyRequest;
    const reply = { send: jest.fn() } as unknown as FastifyReply;

    expect(() => controller.refreshToken(request, reply)).toThrow(
      new BadRequestException({
        code: ErrorCodeEnum.INVALID_TOKEN,
        message: 'Token is not provided',
      }),
    );
  });

  it('throws NotFoundException if user is not found', () => {
    const newWallet = ethers.Wallet.createRandom();
    const oldToken = authService.generateToken({ wallet: newWallet.address });
    const request = { cookies: { token: oldToken } } as unknown as FastifyRequest;
    const reply = { setCookie: jest.fn(), send: jest.fn() } as unknown as FastifyReply;

    jest.spyOn(authService, 'decodeToken').mockReturnValue({ wallet: newWallet.address });

    expect(() => controller.refreshToken(request, reply)).toThrow(
      new NotFoundException({
        code: ErrorCodeEnum.USER_NOT_FOUND,
        message: 'User not found',
      }),
    );
  });
});