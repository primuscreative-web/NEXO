import { context, trace } from '@opentelemetry/api'
import pino, { type Logger } from 'pino'

export interface LoggerOptions {
  readonly level: string
  readonly service: string
}

export function currentTraceContext(): Record<string, string> {
  const span = trace.getSpan(context.active())

  return span
    ? {
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
      }
    : {}
}

export function createLogger(options: LoggerOptions): Logger {
  return pino({
    base: { service: options.service },
    level: options.level,
    mixin: currentTraceContext,
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'req.headers.authorization',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
  })
}
