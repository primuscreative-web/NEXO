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
import { MetaWebhookService } from './meta-webhook.service.js'

interface RawBodyRequest {
  rawBody?: Buffer
}

@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(private readonly webhooks: MetaWebhookService) {}

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
  receive(
    @Req() request: RawBodyRequest,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    if (!request.rawBody) throw new ForbiddenException()
    try {
      const result = this.webhooks.accept(request.rawBody, signature)
      return { accepted: result.accepted, duplicate: result.duplicate }
    } catch {
      throw new ForbiddenException()
    }
  }
}
