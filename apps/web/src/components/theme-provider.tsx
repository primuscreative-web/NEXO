'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  isThemePreference,
  resolveTheme,
  themeStorageKey,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = window.localStorage.getItem(themeStorageKey)
    setPreferenceState(isThemePreference(stored) ? stored : 'system')
    setSystemDark(media.matches)
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const resolved = resolveTheme(preference, systemDark)
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.dataset.themePreference = preference
  }, [preference, resolved])

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference(next) {
        setPreferenceState(next)
        window.localStorage.setItem(themeStorageKey, next)
      },
    }),
    [preference, resolved],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
