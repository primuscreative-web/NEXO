import { defaultLocale, type SupportedLocale } from './i18n'

export interface FormatContext {
  locale?: SupportedLocale
  organizationTimezone?: string | null
  userTimezone?: string | null
}

export function resolveTimezone(context: FormatContext = {}): string {
  return (
    context.organizationTimezone ??
    context.userTimezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
}

export function formatDateTime(
  value: Date | string,
  context: FormatContext = {},
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(context.locale ?? defaultLocale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: resolveTimezone(context),
  }).format(date)
}

export function formatDate(
  value: Date | string,
  context: FormatContext = {},
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(context.locale ?? defaultLocale, {
    dateStyle: 'medium',
    timeZone: resolveTimezone(context),
  }).format(date)
}

export function formatNumber(
  value: number,
  context: Pick<FormatContext, 'locale'> = {},
): string {
  return new Intl.NumberFormat(context.locale ?? defaultLocale).format(value)
}

export function formatCurrency(
  value: number,
  currency = 'BRL',
  context: Pick<FormatContext, 'locale'> = {},
): string {
  return new Intl.NumberFormat(context.locale ?? defaultLocale, {
    style: 'currency',
    currency,
  }).format(value)
}
