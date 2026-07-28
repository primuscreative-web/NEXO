import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import {
  AccessTokenGuard,
  InboxController,
  InboxService,
  Phase1Controller,
  Phase1Service,
} from '@nexo/api/preview'
import { OutboxRelayService } from '@nexo/worker/preview'
import { PreviewHealthController } from './health.controller.js'
import { PreviewMailboxController } from './preview-mailbox.controller.js'
import { PreviewWebhookHealthController } from './webhook-health.controller.js'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [
    PreviewHealthController,
    PreviewWebhookHealthController,
    PreviewMailboxController,
    Phase1Controller,
    InboxController,
  ],
  providers: [
    Phase1Service,
    InboxService,
    OutboxRelayService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class PreviewRuntimeModule {}
