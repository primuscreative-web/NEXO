import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { HealthController } from './health.controller.js'
import { AccessTokenGuard } from './phase1/auth.guard.js'
import { Phase1Controller } from './phase1/phase1.controller.js'
import { Phase1Service } from './phase1/phase1.service.js'
import { InboxController } from './inbox/inbox.controller.js'
import { InboxService } from './inbox/inbox.service.js'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, Phase1Controller, InboxController],
  providers: [
    Phase1Service,
    InboxService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AppModule {}
