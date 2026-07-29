import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IntegrationsService } from './integrations.service.js'

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('v1/integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list() {
    return this.integrations.list()
  }
}
