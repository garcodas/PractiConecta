import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, httpStatusFor } from '../shared/common/index.js';

/** Formato único de error de la API: `{ code, message, fields? }`. */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof DomainError) {
      const { code, message, fields } = error;
      response.status(httpStatusFor(error.kind)).json({ code, message, ...(fields ? { fields } : {}) });
      return;
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const message = status === 404 ? 'La ruta solicitada no existe.' : 'La petición no es válida.';
      response.status(status).json({ code: status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST', message });
      return;
    }
    this.logger.error(error);
    response.status(500).json({ code: 'INTERNAL', message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
  }
}
