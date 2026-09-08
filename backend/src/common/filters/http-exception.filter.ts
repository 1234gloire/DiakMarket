import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, code } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { status: number; message: string | object; code: string } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.getResponse(),
        code: exception.constructor.name,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return { status: HttpStatus.CONFLICT, message: 'A record with this value already exists', code: 'UNIQUE_CONSTRAINT' };
        case 'P2025':
          return { status: HttpStatus.NOT_FOUND, message: 'Record not found', code: 'NOT_FOUND' };
        case 'P2003':
          return { status: HttpStatus.BAD_REQUEST, message: 'Invalid reference to a related record', code: 'FOREIGN_KEY_CONSTRAINT' };
        default:
          return { status: HttpStatus.BAD_REQUEST, message: 'Database request error', code: exception.code };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}
