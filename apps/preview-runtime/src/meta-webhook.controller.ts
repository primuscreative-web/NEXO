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

interface RawBodyRequest {
  rawBody?: Buffer
}

@Public()
@Controller('webhooks/meta')
export class PreviewMetaWebhookController {
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
      return this.webhooks.accept(request.rawBody, signature)
    } catch {
      throw new ForbiddenException()
    }
  }
}
