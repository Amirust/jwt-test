import { IsNumber, IsString } from 'class-validator';

export class ObjectToSignDTO {
  @IsString()
  bytes: string

  @IsNumber()
  timestamp: number
}