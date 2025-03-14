import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { computeAddress, keccak256, toUtf8Bytes, verifyMessage } from 'ethers';

export interface SignPayload {
  bytes: string;
  timestamp: number;
}

export interface TokenPayload {
  wallet: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService
  ) {}

  verifySignedPayload(notSigned: SignPayload, signed: string, publicKey: string): boolean {
    try {
      // Пересчитываем хеш чтобы понять что подписан именно наш объект
      const recalculatedHash = keccak256(toUtf8Bytes(JSON.stringify(notSigned)));
      // Восстанавливаем адрес через верифай нашего пересчитанного хеша, и того что подписал юзер
      const recoveredAddress = verifyMessage(recalculatedHash, signed);
      const expectedAddress = computeAddress(publicKey);

      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  getUserWalletByPublicKey(publicKey: string): string {
    return computeAddress(publicKey);
  }

  // Генерирует объект который клиент должен будет подписать
  generatePayloadToSign(): SignPayload {
    return {
      bytes: randomBytes(32).toString('base64'),
      timestamp: Date.now(),
    }
  }

  generateToken(data: TokenPayload): string {
    return this.jwt.sign(data);
  }

  decodeToken(token: string): TokenPayload {
    return this.jwt.decode(token) as TokenPayload;
  }
}
