export interface StoredObject {
  readonly body: Uint8Array
  readonly contentType: string
}

export interface PutObjectInput extends StoredObject {
  readonly key: string
}

export interface ObjectStoragePort {
  put(input: PutObjectInput): Promise<void>
  get(key: string): Promise<StoredObject | null>
  delete(key: string): Promise<void>
}

/** Test-only adapter. Managed-provider adapters are selected when storage enters scope. */
export class InMemoryObjectStorageAdapter implements ObjectStoragePort {
  private readonly objects = new Map<string, StoredObject>()

  put(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, {
      body: input.body.slice(),
      contentType: input.contentType,
    })
    return Promise.resolve()
  }

  get(key: string): Promise<StoredObject | null> {
    const value = this.objects.get(key)
    return Promise.resolve(
      value ? { ...value, body: value.body.slice() } : null,
    )
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key)
    return Promise.resolve()
  }
}
