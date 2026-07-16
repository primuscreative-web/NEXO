import { Module } from '@nestjs/common'
import { HealthController } from './health.controller.js'
import { OutboxRelayService } from './outbox-relay.service.js'

@Module({
  controllers: [HealthController],
  providers: [OutboxRelayService],
})
export class AppModule {}
