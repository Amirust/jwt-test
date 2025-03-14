import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, ResponseError } from '@app/response/response.dto';
import { FastifyReply } from 'fastify';
import { instanceToPlain } from 'class-transformer';
import { ErrorCodeEnum } from '@app/common/error-code.enum';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  async catch(exception: any, host: ArgumentsHost): Promise<any> {
    const response = new Response();
    response.result = null;
    response.ok = false;
    response.errors = [];

    let responseCode = 400;

    if (exception instanceof HttpException) {
      const error = new ResponseError();
      error.code = ErrorCodeEnum.UNKNOWN;
      error.message = exception.message;
      error.details = [];

      if (exception.getResponse() instanceof Object) {
        const body = exception.getResponse() as {
          code?: ErrorCodeEnum;
          details?: any[];
          message?: any;
        };
        if (body?.code) error.code = body.code;
        let details = body.details;
        if (Array.isArray(body.message)) {
          details = body.message;
        }

        error.details.push(...(details ?? []));
      }

      response.errors.push(error);
      responseCode = exception.getStatus();
    } else if (exception instanceof Error) {
      responseCode = 500;
    }
    const httpHost = host.switchToHttp();
    const reply = httpHost.getResponse<FastifyReply>();

    this.logger.verbose(
      `Caught an exception - ${exception}`,
      exception?.stack ?? 'no stack',
    );

    reply
      .status(responseCode)
      .header('Content-Type', 'application/json')
      .send(instanceToPlain(response));
  }
}
