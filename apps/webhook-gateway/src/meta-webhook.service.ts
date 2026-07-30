import { Injectable } from '@nestjs/common'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export interface MetaWebhookResult {
  accepted: true
  duplicate: boolean
}

@Injectable()
export class MetaWebhookService {
  private readonly seen = new Map<string, number>()
  private readonly replayWindowMs = 10 * 60 * 1000

  verifyChallenge(mode?: string, token?: string, challenge?: string) {
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN
    if (!expected || mode !== 'subscribe' || !token || !challenge) return null
    return this.constantTimeEqual(token, expected) ? challenge : null
  }

  accept(rawBody: Buffer, signature?: string): MetaWebhookResult {
    const secret = process.env.META_APP_SECRET
    if (!secret || !signature?.startsWith('sha256=')) {
      throw new Error('META_SIGNATURE_INVALID')
    }

    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
    if (!this.constantTimeEqual(signature, expected)) {
      throw new Error('META_SIGNATURE_INVALID')
    }

    const now = Date.now()
    this.prune(now)
    const deliveryId = createHash('sha256').update(rawBody).digest('hex')
    if (this.seen.has(deliveryId)) return { accepted: true, duplicate: true }
    this.seen.set(deliveryId, now + this.replayWindowMs)
    return { accepted: true, duplicate: false }
  }

  private prune(now: number) {
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(key)
    }
  }

  private constantTimeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    )
  }
}
