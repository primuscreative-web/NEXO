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
const adapter = new FastifyAdapter()
adapter
  .getInstance()
  .addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body)
      ;(request as typeof request & { rawBody: Buffer }).rawBody = rawBody
      try {
        done(null, JSON.parse(rawBody.toString('utf8')))
      } catch (error) {
        done(error as Error)
      }
    },
  )
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  adapter,
  { bodyParser: false, logger: false },
)
app.enableShutdownHooks()
const port = parsePort(process.env.WEBHOOK_GATEWAY_PORT, 3003)
await app.listen(port, '0.0.0.0')
logger.info({ port }, 'webhook gateway started')
