'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface Column {
  key: string
  label: string
}

export function ResourcePage({
  title,
  description,
  endpoint,
  columns,
  empty,
}: {
  title: string
  description: string
  endpoint: string
  columns: readonly Column[]
  empty: string
}) {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const request = endpoint.includes('{organizationId}')
      ? apiFetch<{ activeOrganizationId: string | null }>('/v1/auth/me', {
          signal: controller.signal,
        }).then((me) => {
          if (!me.activeOrganizationId)
            throw new Error('Selecione uma organização para continuar.')
          return apiFetch<Record<string, unknown>[]>(
            endpoint.replace('{organizationId}', me.activeOrganizationId),
            { signal: controller.signal },
          )
        })
      : apiFetch<Record<string, unknown>[]>(endpoint, {
          signal: controller.signal,
        })
    request
      .then((result) =>
        setItems(
          Array.isArray(result)
            ? result
            : ((result as { items?: Record<string, unknown>[] }).items ?? []),
        ),
      )
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Falha ao carregar.'),
      )
    return () => controller.abort()
  }, [endpoint])

  return (
    <section aria-labelledby="resource-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONFIGURAÇÕES</p>
          <h1 id="resource-title">{title}</h1>
          <p className="summary">{description}</p>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {!items && !error && <div className="skeleton" aria-label="Carregando" />}
      {items?.length === 0 && (
        <div className="empty-state">
          <h2>Nada por aqui ainda</h2>
          <p>{empty}</p>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={rowKey(item, index)}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {formatValue(readPath(item, column.key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function readPath(value: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null) return undefined
    return (current as Record<string, unknown>)[part]
  }, value)
}

function formatValue(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString('pt-BR')
  if (typeof value === 'string')
    return /^\d{4}-\d{2}-\d{2}T/u.test(value)
      ? new Date(value).toLocaleString('pt-BR')
      : value
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string' || typeof value === 'number') return `${value}`
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return '—'
}

function rowKey(item: Record<string, unknown>, index: number): string {
  return typeof item.id === 'string' || typeof item.id === 'number'
    ? `${item.id}`
    : `row-${index}`
}
