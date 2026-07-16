import { Controller, Get } from '@nestjs/common'
import { createHealthSnapshot } from '@nexo/shared'
@Controller('health')
export class HealthController {
  @Get('live') live() {
    return createHealthSnapshot('webhook-gateway')
  }
  @Get('ready') ready() {
    return createHealthSnapshot('webhook-gateway')
  }
}
