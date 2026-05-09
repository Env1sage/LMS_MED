import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected database error occurred';

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        const fields = (exception.meta?.target as string[])?.join(', ') || 'unknown field';
        message = `A record with this ${fields} already exists`;
        break;
      }
      case 'P2003': {
        // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        const field = (exception.meta?.field_name as string) || 'reference';
        message = `Invalid reference: the referenced ${field} does not exist`;
        break;
      }
      case 'P2025': {
        // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'The requested record was not found';
        break;
      }
      case 'P2014': {
        // Required relation violation
        status = HttpStatus.BAD_REQUEST;
        message = 'This operation would violate a required relation';
        break;
      }
      default:
        this.logger.error(
          `Unhandled Prisma error [${exception.code}]: ${exception.message}`,
          exception.stack,
        );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.code,
    });
  }
}
