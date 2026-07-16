import { Catch, HttpException, HttpStatus } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { IdentityRuleError } from '@nexo/identity'
import { AuthorizationDeniedError } from '@nexo/organization'
import { Phase1Error } from './phase1.service.js'

interface ErrorReply {
  status(code: number): ErrorReply
  send(body: object): void
}

interface ErrorRequest {
  headers: Readonly<Record<string, string | string[] | undefined>>
}

@Catch()
export class Phase1ExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ErrorReply>()
    const request = host.switchToHttp().getRequest<ErrorRequest>()
    const correlationHeader = request.headers['x-correlation-id']
    const correlationId =
      typeof correlationHeader === 'string'
        ? correlationHeader
        : crypto.randomUUID()

    if (exception instanceof Phase1Error) {
      response.status(exception.status).send({
        error: {
          code: exception.code,
          message: exception.message,
          correlationId,
        },
      })
      return
    }
    if (exception instanceof AuthorizationDeniedError) {
      response.status(HttpStatus.FORBIDDEN).send({
        error: {
          code: exception.reason,
          message: 'Forbidden',
          correlationId,
        },
      })
      return
    }
    if (exception instanceof IdentityRuleError) {
      response.status(HttpStatus.UNAUTHORIZED).send({
        error: {
          code: exception.code,
          message: 'Unauthorized',
          correlationId,
        },
      })
      return
    }
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).send({
        error: {
          code: `http_${exception.getStatus()}`,
          message:
            exception.getStatus() >= 500
              ? 'Internal server error'
              : exception.message,
          correlationId,
        },
      })
      return
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: {
        code: 'internal_error',
        message: 'Internal server error',
        correlationId,
      },
    })
  }
}
