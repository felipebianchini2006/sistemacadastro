import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  CORRELATION_ID_HEADER,
  RequestWithCorrelation,
} from '../middleware/correlation-id.middleware';

const statusTitles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const detail = this.getDetail(exception, exceptionResponse);
    const errors = this.getErrors(exceptionResponse);

    const correlationId =
      (request as RequestWithCorrelation).correlationId ||
      request.header(CORRELATION_ID_HEADER);

    const problem = {
      type: `https://httpstatuses.com/${status}`,
      title: statusTitles[status] ?? 'Unexpected Error',
      status,
      detail,
      instance: request.originalUrl ?? request.url,
      traceId: correlationId,
      ...(errors ? { errors } : {}),
    };

    response.status(status).json(problem);
  }

  private getDetail(exception: unknown, exceptionResponse?: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const message = (exceptionResponse as { message?: string | string[] })
        .message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (message) {
        return message;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Unexpected error';
  }

  private getErrors(exceptionResponse?: unknown): string[] | undefined {
    if (!exceptionResponse || typeof exceptionResponse !== 'object') {
      return undefined;
    }

    const message = (exceptionResponse as { message?: string | string[] })
      .message;
    if (Array.isArray(message)) {
      return message;
    }

    return undefined;
  }
}
