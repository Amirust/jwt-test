import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService, SignPayload } from './auth.service';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('verifies signed payload correctly', async () => {
    const notSigned: SignPayload = { bytes: 'test', timestamp: 123456 };
    const wallet = ethers.Wallet.createRandom();
    const publicKey = wallet.publicKey;

    const signed = await wallet.signMessage(keccak256(toUtf8Bytes(JSON.stringify(notSigned))));

    const result = service.verifySignedPayload(notSigned, signed, publicKey);

    expect(result).toBe(true);
  });

  it('returns false for invalid public key', async () => {
    const notSigned: SignPayload = { bytes: 'test', timestamp: 123456 }
    const wallet = ethers.Wallet.createRandom();

    const signed = await wallet.signMessage(keccak256(toUtf8Bytes(JSON.stringify(notSigned))));

    const result = service.verifySignedPayload(notSigned, signed, '0x03');

    expect(result).toBe(false);
  });

  it('returns user wallet by public key', async () => {
    const wallet = ethers.Wallet.createRandom();
    const publicKey = wallet.publicKey;

    const result = service.getUserWalletByPublicKey(publicKey);

    expect(result).toBe(wallet.address);
  });

  it('generates payload to sign', async () => {
    const result = service.generatePayloadToSign();

    expect(result).toHaveProperty('bytes');
    expect(result).toHaveProperty('timestamp');
  });
});