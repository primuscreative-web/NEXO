import { Controller, Get } from '@nestjs/common'
import { createHealthSnapshot } from '@nexo/shared'
import { Public } from '@nexo/api/src/phase1/auth.guard.js'

@Public()
@Controller('webhooks/health')
export class PreviewWebhookHealthController {
  @Get('live')
  live() {
    return createHealthSnapshot('webhook-gateway')
  }

  @Get('ready')
  ready() {
    return createHealthSnapshot('webhook-gateway')
  }
}
