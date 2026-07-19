import { clsx, type ClassValue } from 'clsx'

export function cn(...values: ClassValue[]): string {
  return clsx(values)
}

export function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
    .join('')
}
