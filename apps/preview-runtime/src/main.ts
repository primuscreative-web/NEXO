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
  app.enableCors({
    origin: allowedOrigins,
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
          allowedOrigins,
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

bootstrap().catch((error: unknown) => {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`[preview-runtime] ${detail}\n`)
  process.exitCode = 1
})
