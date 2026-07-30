import { Module } from '@nestjs/common'
import { HealthController } from './health.controller.js'
import { MetaWebhookController } from './meta-webhook.controller.js'
import { MetaWebhookService } from './meta-webhook.service.js'

@Module({
  controllers: [HealthController, MetaWebhookController],
  providers: [MetaWebhookService],
})
export class AppModule {}
