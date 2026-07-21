import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AccessTokenGuard } from '@nexo/api/src/phase1/auth.guard.js'
import { Phase1Controller } from '@nexo/api/src/phase1/phase1.controller.js'
import { Phase1Service } from '@nexo/api/src/phase1/phase1.service.js'
import { InboxController } from '@nexo/api/src/inbox/inbox.controller.js'
import { InboxService } from '@nexo/api/src/inbox/inbox.service.js'
import { OutboxRelayService } from '@nexo/worker/src/outbox-relay.service.js'
import { PreviewHealthController } from './health.controller.js'
import { PreviewWebhookHealthController } from './webhook-health.controller.js'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [
    PreviewHealthController,
    PreviewWebhookHealthController,
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
