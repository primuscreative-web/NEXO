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

const environment = parseServiceEnvironment(process.env)
const logger = createLogger({ level: environment.LOG_LEVEL, service: 'api' })
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { logger: false },
)
app.enableShutdownHooks()
await app.register(cookie)
await app.register(helmet, {
  contentSecurityPolicy: false,
})
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
const openApi = new DocumentBuilder()
  .setTitle('NEXO API')
  .setDescription('NEXO Identity and Organization API')
  .setVersion('1.0')
  .addBearerAuth()
  .build()
SwaggerModule.setup('openapi', app, SwaggerModule.createDocument(app, openApi))
const port = parsePort(process.env.API_PORT, 3001)
await app.listen(port, '0.0.0.0')
logger.info({ port }, 'api started')
