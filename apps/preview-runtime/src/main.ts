import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import {
  Phase1ExceptionFilter,
  isTrustedMutationOrigin,
} from '@nexo/api/preview'
import { parseServiceEnvironment } from '@nexo/config'
import { createLogger } from '@nexo/observability'
import {
  assertPreviewRuntimeEnvironment,
  previewRuntimePort,
} from './environment.js'
import { PreviewRuntimeModule } from './app.module.js'

async function bootstrap(): Promise<void> {
  assertPreviewRuntimeEnvironment(process.env)
  const environment = parseServiceEnvironment(process.env)
  const logger = createLogger({
    level: environment.LOG_LEVEL,
    service: 'preview-runtime',
  })
  const app = await NestFactory.create<NestFastifyApplication>(
    PreviewRuntimeModule,
    new FastifyAdapter({ maxParamLength: 256 }),
    { logger: false },
  )

  app.enableShutdownHooks()
  await app.register(cookie)
  await app.register(helmet, { contentSecurityPolicy: false })

  const webOrigin = process.env.WEB_ORIGIN
  if (!webOrigin) throw new Error('Missing WEB_ORIGIN')
  const allowedOrigins = webOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const isAllowedOrigin = (origin: string): boolean =>
    allowedOrigins.includes(origin) || isVercelNexoPreviewOrigin(origin)
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, false)
        return
      }
      callback(null, isAllowedOrigin(origin) ? origin : false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, reply, done) => {
      if (
        !isTrustedMutationOrigin({
          method: request.method,
          ...(request.headers.origin ? { origin: request.headers.origin } : {}),
          allowedOrigins:
            request.headers.origin && isAllowedOrigin(request.headers.origin)
              ? [...allowedOrigins, request.headers.origin]
              : allowedOrigins,
        })
      ) {
        reply.code(403).send({
          error: {
            code: 'untrusted_origin',
            message: 'Forbidden',
            correlationId: crypto.randomUUID(),
          },
        })
        return
      }
      done()
    })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new Phase1ExceptionFilter())

  const port = previewRuntimePort(process.env)
  await app.listen(port, '0.0.0.0')
  logger.info({ port }, 'preview runtime started')
}

function isVercelNexoPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'https:' &&
      /^nexo-[a-z0-9-]+-primuscreative-webs-projects\.vercel\.app$/u.test(
        url.hostname,
      )
    )
  } catch {
    return false
  }
}

bootstrap().catch((error: unknown) => {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`[preview-runtime] ${detail}\n`)
  process.exitCode = 1
})
