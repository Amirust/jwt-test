import { ErrorCodeEnum } from '@app/common/error-code.enum';

export class Response<T> {
  declare ok: boolean;
  declare result: T;
  declare errors: ResponseError[];
}

export class ResponseError {
  declare code: ErrorCodeEnum;
  declare message: string;
  declare details: any[];
}
