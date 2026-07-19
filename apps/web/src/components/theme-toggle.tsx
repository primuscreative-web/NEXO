'use client'

import { IconButton, Tooltip } from '@nexo/ui'
import { Laptop, Moon, Sun } from 'lucide-react'
import { t } from '../lib/i18n'
import type { ThemePreference } from '../lib/theme'
import { useTheme } from './theme-provider'

const sequence: readonly ThemePreference[] = ['system', 'light', 'dark']

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const index = sequence.indexOf(preference)
  const next = sequence[(index + 1) % sequence.length] ?? 'system'
  const labels: Record<ThemePreference, string> = {
    light: t('theme.light'),
    dark: t('theme.dark'),
    system: t('theme.system'),
  }
  const icons = {
    light: <Sun />,
    dark: <Moon />,
    system: <Laptop />,
  } satisfies Record<ThemePreference, React.ReactNode>
  const label = t('theme.switchTo', { theme: labels[next] })
  return (
    <Tooltip content={`${t('theme.label')}: ${labels[preference]}`}>
      <IconButton
        data-testid="theme-toggle"
        icon={icons[preference]}
        label={label}
        variant="ghost"
        onClick={() => setPreference(next)}
      />
    </Tooltip>
  )
}
