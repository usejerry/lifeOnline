import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiError, ApiResponse } from '../interfaces/api-response.interface';

interface ExceptionRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface HttpErrorResponse {
  code?: string;
  message?: string | string[];
  errors?: ApiError[];
}

const HTTP_ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const request = context.getRequest<ExceptionRequest>();
    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details: HttpErrorResponse =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : { message: String(exceptionResponse ?? '服务器内部错误') };
    const validationMessages = Array.isArray(details.message)
      ? details.message
      : undefined;
    const responseBody: ApiResponse<null> = {
      code:
        details.code ??
        (validationMessages
          ? 'VALIDATION_ERROR'
          : (HTTP_ERROR_CODES[status] ?? 'INTERNAL_ERROR')),
      success: false,
      message: validationMessages
        ? '请求参数不正确'
        : typeof details.message === 'string'
          ? details.message
          : '服务器内部错误',
      data: null,
      ...(details.errors
        ? { errors: details.errors }
        : validationMessages
          ? { errors: validationMessages.map((message) => ({ message })) }
          : {}),
    };

    const getHeader = (name: string): string => {
      const value = request.headers?.[name];
      return Array.isArray(value) ? value.join(', ') : (value ?? 'unknown');
    };
    const errorMessage =
      exception instanceof Error ? exception.message : 'Unknown exception';
    const log = {
      message: `${httpAdapter.getRequestMethod(request)} ${httpAdapter.getRequestUrl(request)} ${status} - ${errorMessage}`,
      clientIp: request.ip ?? request.socket?.remoteAddress ?? 'unknown',
      userAgent: getHeader('user-agent'),
      browser: getHeader('sec-ch-ua'),
      platform: getHeader('sec-ch-ua-platform'),
      mobile: getHeader('sec-ch-ua-mobile'),
      serverEnvironment: process.env.NODE_ENV ?? 'development',
    };

    if (status >= 500) {
      this.logger.error({
        ...log,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else {
      this.logger.warn(log);
    }

    httpAdapter.reply(context.getResponse(), responseBody, status);
  }
}
