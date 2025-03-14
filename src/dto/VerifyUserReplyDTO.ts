import { ObjectToSignDTO } from './ObjectToSignDTO';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class VerifyUserReplyDTO {
  @ValidateNested({ each: true })
  @Type(() => ObjectToSignDTO)
  notSignedData: ObjectToSignDTO

  @IsString()
  signedData: string

  @IsString()
  publicKey: string
}