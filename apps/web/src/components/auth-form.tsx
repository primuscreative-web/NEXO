'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiFetch } from '../lib/api'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const data = new FormData(event.currentTarget)
    try {
      if (mode === 'login') {
        await apiFetch('/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: data.get('email'),
            password: data.get('password'),
          }),
        })
        router.push('/app')
      } else if (mode === 'register') {
        await apiFetch('/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: data.get('name'),
            email: data.get('email'),
            password: data.get('password'),
          }),
        })
        router.push('/verify-email')
      } else if (mode === 'forgot') {
        await apiFetch('/v1/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: data.get('email') }),
        })
        setMessage(
          'Se a conta existir, enviaremos as instruções de recuperação.',
        )
      } else if (mode === 'reset') {
        await apiFetch('/v1/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            token: search.get('token') ?? data.get('token'),
            password: data.get('password'),
          }),
        })
        router.push('/login?reset=1')
      } else {
        await apiFetch('/v1/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({
            token: search.get('token') ?? data.get('token'),
          }),
        })
        router.push('/login?verified=1')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha inesperada.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand" aria-labelledby="brand-title">
        <p className="eyebrow">NEXO · OPERAÇÕES CONECTADAS</p>
        <h1 id="brand-title">
          Sua empresa, equipes e acessos em um único lugar.
        </h1>
        <p className="summary">
          Identidade segura, isolamento por organização e permissões verificadas
          em cada ação.
        </p>
      </section>
      <section className="auth-card" aria-labelledby="form-title">
        <p className="eyebrow">ACESSO SEGURO</p>
        <h2 id="form-title">
          {mode === 'login' && 'Entrar no NEXO'}
          {mode === 'register' && 'Criar sua conta'}
          {mode === 'forgot' && 'Recuperar acesso'}
          {mode === 'reset' && 'Definir nova senha'}
          {mode === 'verify' && 'Confirmar seu e-mail'}
        </h2>
        <form onSubmit={submit} aria-busy={pending}>
          {mode === 'register' && (
            <label>
              Nome completo
              <input
                name="name"
                minLength={2}
                maxLength={160}
                required
                autoComplete="name"
              />
            </label>
          )}
          {mode !== 'reset' && mode !== 'verify' && (
            <label>
              E-mail
              <input name="email" type="email" required autoComplete="email" />
            </label>
          )}
          {mode === 'reset' && !search.get('token') && (
            <label>
              Token de recuperação
              <input name="token" required autoComplete="off" />
            </label>
          )}
          {mode === 'verify' && !search.get('token') && (
            <label>
              Token de verificação
              <input name="token" required autoComplete="off" />
            </label>
          )}
          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <label>
              {mode === 'reset' ? 'Nova senha' : 'Senha'}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
              />
              {mode !== 'login' && (
                <span className="hint">
                  Use ao menos 12 caracteres, maiúscula, minúscula e número.
                </span>
              )}
            </label>
          )}
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="alert success" role="status">
              {message}
            </p>
          )}
          <button className="button primary" disabled={pending} type="submit">
            {pending
              ? 'Processando…'
              : mode === 'login'
                ? 'Entrar'
                : 'Continuar'}
          </button>
        </form>
        <nav className="auth-links" aria-label="Alternativas de acesso">
          {mode === 'login' ? (
            <>
              <Link href="/forgot-password">Esqueci minha senha</Link>
              <Link href="/register">Criar conta</Link>
            </>
          ) : (
            <Link href="/login">Voltar ao login</Link>
          )}
        </nav>
      </section>
    </main>
  )
}
