import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { parsePort, parseServiceEnvironment } from '@nexo/config'
import { createLogger } from '@nexo/observability'
import { AppModule } from './app.module.js'
const environment = parseServiceEnvironment(process.env)
const logger = createLogger({
  level: environment.LOG_LEVEL,
  service: 'webhook-gateway',
})
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { logger: false },
)
app.enableShutdownHooks()
const port = parsePort(process.env.WEBHOOK_GATEWAY_PORT, 3003)
await app.listen(port, '0.0.0.0')
logger.info({ port }, 'webhook gateway started')
