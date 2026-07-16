import { describe, expect, it } from 'vitest'
import { InMemoryObjectStorageAdapter } from '../src/index.js'

describe('InMemoryObjectStorageAdapter', () => {
  it('implements the replaceable storage contract without external data', async () => {
    const storage = new InMemoryObjectStorageAdapter()
    await storage.put({
      key: 'sandbox/example.txt',
      body: new TextEncoder().encode('NEXO'),
      contentType: 'text/plain',
    })
    expect(await storage.get('sandbox/example.txt')).toMatchObject({
      contentType: 'text/plain',
    })
    await storage.delete('sandbox/example.txt')
    expect(await storage.get('sandbox/example.txt')).toBeNull()
  })
})
