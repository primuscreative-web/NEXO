export const HEALTH_STATUS = 'ok' as const

export interface HealthSnapshot {
  readonly service: string
  readonly status: typeof HEALTH_STATUS
  readonly timestamp: string
  readonly uptimeSeconds: number
}

export function createHealthSnapshot(
  service: string,
  now = new Date(),
): HealthSnapshot {
  return {
    service,
    status: HEALTH_STATUS,
    timestamp: now.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }
}
