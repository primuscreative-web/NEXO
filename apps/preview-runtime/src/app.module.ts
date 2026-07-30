import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import {
  AccessTokenGuard,
  InboxController,
  InboxService,
  IntegrationsController,
  IntegrationsService,
  Phase1Controller,
  Phase1Service,
} from '@nexo/api/preview'
import { OutboxRelayService } from '@nexo/worker/preview'
import { MetaWebhookService } from '@nexo/webhook-gateway/preview'
import { PreviewHealthController } from './health.controller.js'
import { PreviewMetaWebhookController } from './meta-webhook.controller.js'
import { PreviewMailboxController } from './preview-mailbox.controller.js'
import { PreviewWebhookHealthController } from './webhook-health.controller.js'
import { WhatsAppWebhookProcessor } from './whatsapp-webhook.processor.js'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [
    PreviewHealthController,
    PreviewWebhookHealthController,
    PreviewMetaWebhookController,
    PreviewMailboxController,
    Phase1Controller,
    InboxController,
    IntegrationsController,
  ],
  providers: [
    Phase1Service,
    InboxService,
    IntegrationsService,
    OutboxRelayService,
    MetaWebhookService,
    WhatsAppWebhookProcessor,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class PreviewRuntimeModule {}
