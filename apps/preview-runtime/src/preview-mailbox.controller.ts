import { timingSafeEqual } from 'node:crypto'
import { Controller, Get, Headers, Inject, Query } from '@nestjs/common'
import { Phase1Error, Phase1Service, Public } from '@nexo/api/preview'
import { normalizeEmail } from '@nexo/identity'

@Public()
@Controller('preview/mailbox')
export class PreviewMailboxController {
  constructor(@Inject(Phase1Service) private readonly phase1: Phase1Service) {}

  @Get('reset-link')
  resetLink(
    @Query('email') email: string | undefined,
    @Headers('x-preview-mailbox-key') providedKey: string | undefined,
  ): { path: string } {
    const configuredKey = process.env.PREVIEW_MAILBOX_ACCESS_KEY
    if (
      process.env.APP_ENV !== 'preview' ||
      !configuredKey ||
      !providedKey ||
      !securelyEqual(configuredKey, providedKey) ||
      !email
    )
      throw new Phase1Error('not_found', 404, 'Not found')

    const normalizedEmail = normalizeEmail(email)
    const message = this.phase1.emails.messages.findLast(
      (candidate) =>
        candidate.template === 'reset-password' &&
        candidate.to === normalizedEmail,
    )
    const token = message?.parameters.token
    if (!token) throw new Phase1Error('not_found', 404, 'Not found')
    return { path: `/reset-password?token=${encodeURIComponent(token)}` }
  }
}

function securelyEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}
