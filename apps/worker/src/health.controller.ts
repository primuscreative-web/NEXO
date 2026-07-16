import { Controller, Get } from '@nestjs/common'
import { createHealthSnapshot } from '@nexo/shared'
@Controller('health')
export class HealthController {
  @Get('live') live() {
    return createHealthSnapshot('worker')
  }
  @Get('ready') ready() {
    return createHealthSnapshot('worker')
  }
}
