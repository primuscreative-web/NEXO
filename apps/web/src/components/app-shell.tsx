'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import { ThemeToggle } from './theme-toggle'

const navigation = [
  ['/app', 'Visão geral'],
  ['/app/organization', 'Organização'],
  ['/app/members', 'Pessoas e convites'],
  ['/app/teams', 'Equipes'],
  ['/app/roles', 'Papéis e permissões'],
  ['/app/sessions', 'Sessões ativas'],
  ['/app/audit', 'Auditoria'],
  ['/app/profile', 'Perfil'],
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link className="logo" href="/app" aria-label="NEXO início">
          NEXO
        </Link>
        <nav aria-label="Navegação principal">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              className={path === href ? 'active' : ''}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="status-dot">Ambiente seguro</span>
          <div className="topbar-actions">
            <ThemeToggle />
            <button
              className="button ghost"
              type="button"
              onClick={async () => {
                await apiFetch('/v1/auth/logout', { method: 'POST' })
                router.push('/login')
              }}
            >
              Sair
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
