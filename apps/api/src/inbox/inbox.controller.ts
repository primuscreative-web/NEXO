import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../phase1/auth.guard.js'
import {
  CreateInboxDto,
  CreateNoteDto,
  CreateTagDto,
  SendMessageDto,
  SimulateMessageDto,
  UpdateConversationDto,
} from '../phase1/dto.js'
import { Phase1Error, type AuthPrincipal } from '../phase1/phase1.service.js'
import { InboxService } from './inbox.service.js'
@ApiTags('Inbox MVP')
@ApiBearerAuth()
@Controller('v1')
export class InboxController {
  constructor(@Inject(InboxService) private readonly inbox: InboxService) {}
  @Get('inbox/conversations') list(
    @Req() r: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inbox.list(this.#p(r), {
      ...(status ? { status } : {}),
      limit: Number(limit) || 25,
    })
  }
  @Post('inboxes') create(
    @Body() b: CreateInboxDto,
    @Req() r: AuthenticatedRequest,
    @Headers('x-csrf-token') c?: string,
  ) {
    this.#c(r, c)
    return this.inbox.createInbox(this.#p(r), b.name, this.#x(r))
  }
  @Post('inbox/simulator/messages') simulate(
    @Body() b: SimulateMessageDto,
    @Req() r: AuthenticatedRequest,
    @Headers('x-csrf-token') c?: string,
  ) {
    this.#c(r, c)
    return this.inbox.simulateInbound(this.#p(r), b, this.#x(r))
  }
  @Post('inbox/conversations/:id/messages') reply(
    @Param('id') id: string,
    @Body() b: SendMessageDto,
    @Req() r: AuthenticatedRequest,
    @Headers('x-csrf-token') c?: string,
  ) {
    this.#c(r, c)
    return this.inbox.reply(this.#p(r), id, b.body, this.#x(r))
  }
  @Patch('inbox/conversations/:id') update(
    @Param('id') id: string,
    @Body() b: UpdateConversationDto,
    @Req() r: AuthenticatedRequest,
    @Headers('x-csrf-token') c?: string,
  ) {
    this.#c(r, c)
    return this.inbox.updateConversation(this.#p(r), id, b, this.#x(r))
  }
  @Post('inbox/conversations/:id/notes') note(
    @Param('id') id: string,
    @Body() b: CreateNoteDto,
    @Req() r: AuthenticatedRequest,
    @Headers('x-csrf-token') c?: string,
  ) {
    this.#c(r, c)
    return this.inbox.addNote(this.#p(r), id, b.body, this.#x(r))
  }
  @Post('inbox/tags') tag(
    @Body() b: CreateTagDto,
    @Req() r: AuthenticatedRequest,
    @Headers('x-csrf-token') c?: string,
  ) {
    this.#c(r, c)
    return this.inbox.createTag(this.#p(r), b.name, b.color)
  }
  @Get('inbox/dashboard') dashboard(@Req() r: AuthenticatedRequest) {
    return this.inbox.dashboard(this.#p(r))
  }
  #p(r: AuthenticatedRequest): AuthPrincipal {
    if (!r.principal) throw new Phase1Error('unauthorized', 401, 'Unauthorized')
    return r.principal
  }
  #c(r: AuthenticatedRequest, c?: string) {
    if (!c || c !== r.cookies?.nexo_csrf)
      throw new Phase1Error('invalid_csrf', 403, 'Forbidden')
  }
  #x(r: AuthenticatedRequest) {
    return {
      correlationId:
        typeof r.headers['x-correlation-id'] === 'string'
          ? r.headers['x-correlation-id']
          : crypto.randomUUID(),
    }
  }
}
