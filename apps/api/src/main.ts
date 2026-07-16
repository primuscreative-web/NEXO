import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { parsePort, parseServiceEnvironment } from '@nexo/config'
import { createLogger } from '@nexo/observability'
import { AppModule } from './app.module.js'
import { Phase1ExceptionFilter } from './phase1/phase1-exception.filter.js'

async function bootstrap(): Promise<void> {
  if (process.env.CI)
    process.stderr.write('[api-bootstrap] creating Nest application\n')
  const environment = parseServiceEnvironment(process.env)
  const logger = createLogger({ level: environment.LOG_LEVEL, service: 'api' })
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ maxParamLength: 256 }),
    { logger: false },
  )
  if (process.env.CI)
    process.stderr.write('[api-bootstrap] Nest application created\n')
  app.enableShutdownHooks()
  await app.register(cookie)
  if (process.env.CI)
    process.stderr.write('[api-bootstrap] cookies registered\n')
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })
  if (process.env.CI)
    process.stderr.write('[api-bootstrap] security headers registered\n')
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new Phase1ExceptionFilter())
  if (process.env.OPENAPI_ENABLED !== 'false') {
    const openApi = new DocumentBuilder()
      .setTitle('NEXO API')
      .setDescription('NEXO Identity and Organization API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    SwaggerModule.setup(
      'openapi',
      app,
      SwaggerModule.createDocument(app, openApi),
    )
  }
  if (process.env.CI)
    process.stderr.write('[api-bootstrap] OpenAPI registered\n')
  const port = parsePort(process.env.API_PORT, 3001)
  await app.listen(port, '0.0.0.0')
  if (process.env.CI) process.stderr.write('[api-bootstrap] listening\n')
  logger.info({ port }, 'api started')
}

bootstrap().catch((error: unknown) => {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`[api-bootstrap] ${detail}\n`)
  process.exitCode = 1
})
