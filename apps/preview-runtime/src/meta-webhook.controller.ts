import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { Public } from '@nexo/api/preview'
import { MetaWebhookService } from '@nexo/webhook-gateway/preview'
import { WhatsAppWebhookProcessor } from './whatsapp-webhook.processor.js'

interface RawBodyRequest {
  rawBody?: Buffer
}

@Public()
@Controller('webhooks/meta')
export class PreviewMetaWebhookController {
  constructor(
    private readonly webhooks: MetaWebhookService,
    private readonly whatsapp: WhatsAppWebhookProcessor,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const verifiedChallenge = this.webhooks.verifyChallenge(
      mode,
      token,
      challenge,
    )
    if (!verifiedChallenge) throw new ForbiddenException()
    return verifiedChallenge
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    if (!request.rawBody) throw new ForbiddenException()
    try {
      const result = this.webhooks.accept(request.rawBody, signature)
      if (!result.duplicate) await this.whatsapp.process(result.payload)
      return { accepted: result.accepted, duplicate: result.duplicate }
    } catch {
      throw new ForbiddenException()
    }
  }
}
