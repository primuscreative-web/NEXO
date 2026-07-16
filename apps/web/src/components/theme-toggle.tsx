'use client'

import { useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  return (
    <button
      className="button ghost"
      type="button"
      aria-pressed={dark}
      onClick={() => {
        const next = !dark
        setDark(next)
        document.documentElement.dataset.theme = next ? 'dark' : 'light'
      }}
    >
      {dark ? 'Modo claro' : 'Modo escuro'}
    </button>
  )
}
