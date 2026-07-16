'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../lib/api'

interface OrganizationMembership {
  organization: { id: string; name: string; slug: string; status: string }
  role: { key: string; name: string }
}

export function OrganizationDashboard() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload(signal?: AbortSignal) {
    try {
      setOrganizations(
        await apiFetch('/v1/organizations', signal ? { signal } : {}),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void reload(controller.signal)
    return () => controller.abort()
  }, [])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const slugEntry = data.get('slug')
    const slug = typeof slugEntry === 'string' ? slugEntry.trim() : ''
    try {
      const organization = await apiFetch<{ id: string }>('/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: data.get('name'),
          ...(slug ? { slug } : {}),
        }),
      })
      await apiFetch(`/v1/organizations/${organization.id}/select`, {
        method: 'POST',
      })
      await reload()
      router.refresh()
      event.currentTarget.reset()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Falha ao criar organização.',
      )
    }
  }

  return (
    <section aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1 id="dashboard-title">Suas organizações</h1>
          <p className="summary">
            Escolha o contexto ativo. Todas as permissões são reavaliadas a cada
            troca.
          </p>
        </div>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="skeleton" />
      ) : (
        <div className="card-grid">
          {organizations.map(({ organization, role }) => (
            <article className="card" key={organization.id}>
              <span className="badge">{organization.status}</span>
              <h2>{organization.name}</h2>
              <p>
                {organization.slug} · {role.name}
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={async () => {
                  await apiFetch(
                    `/v1/organizations/${organization.id}/select`,
                    { method: 'POST' },
                  )
                  router.push('/app/organization')
                }}
              >
                Selecionar
              </button>
            </article>
          ))}
        </div>
      )}
      <article className="card form-card">
        <h2>Criar uma organização</h2>
        <form className="inline-form" onSubmit={create}>
          <label>
            Nome
            <input name="name" required minLength={2} maxLength={160} />
          </label>
          <label>
            Slug opcional
            <input name="slug" minLength={3} maxLength={80} />
          </label>
          <button className="button primary" type="submit">
            Criar e selecionar
          </button>
        </form>
      </article>
    </section>
  )
}
