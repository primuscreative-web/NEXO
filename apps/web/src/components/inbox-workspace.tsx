'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useSession } from './session-context'

type Status = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED'

interface Conversation {
  id: string
  status: Status
  unreadCount: number
  lastMessageAt: string | null
  assigneeMembershipId: string | null
}

interface Tag {
  id: string
  name: string
  color: string | null
}

interface Detail {
  conversation: Conversation
  contact: {
    id: string
    name: string
    phone: string | null
    email: string | null
    company: string | null
  }
  inbox: { name: string }
  messages: {
    id: string
    body: string | null
    direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL'
    status: string
    createdAt: string
    metadata: unknown
  }[]
  notes: { id: string; body: string; createdAt: string }[]
  tags: Tag[]
  assignee: { id: string; user: { name: string; email: string } } | null
  team: { id: string; name: string } | null
}

interface Membership {
  id: string
  status: string
  user: { name: string; email: string }
}

interface Page<T> {
  items: T[]
}

const labels: Record<Status, string> = {
  OPEN: 'Aberta',
  PENDING: 'Pendente',
  RESOLVED: 'Resolvida',
  CLOSED: 'Encerrada',
}

export function InboxWorkspace() {
  const session = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [filter, setFilter] = useState<'ALL' | Status>('ALL')
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(
    async (keepSelection = true) => {
      setLoading(true)
      try {
        const organizationId = session.user?.activeOrganizationId
        if (!organizationId) return
        const [list, membershipPage, tags] = await Promise.all([
          apiFetch<Page<Conversation>>(
            `/v1/inbox/conversations?limit=100${filter === 'ALL' ? '' : `&status=${filter}`}`,
          ),
          apiFetch<Page<Membership>>(
            `/v1/organizations/${organizationId}/memberships?limit=100`,
          ),
          apiFetch<Tag[]>('/v1/inbox/tags'),
        ])
        setConversations(list.items)
        setMembers(
          membershipPage.items.filter((member) => member.status === 'ACTIVE'),
        )
        setAllTags(tags)
        const nextId =
          keepSelection &&
          selectedId &&
          list.items.some((item) => item.id === selectedId)
            ? selectedId
            : (list.items[0]?.id ?? null)
        setSelectedId(nextId)
      } catch (cause) {
        setNotice(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar o Inbox.',
        )
      } finally {
        setLoading(false)
      }
    },
    [filter, selectedId, session.user?.activeOrganizationId],
  )

  const loadDetail = useCallback(async (id: string | null) => {
    if (!id) return setDetail(null)
    try {
      setDetail(await apiFetch<Detail>(`/v1/inbox/conversations/${id}`))
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível abrir a conversa.',
      )
    }
  }, [])

  useEffect(() => {
    void reload(false)
  }, [filter, session.user?.activeOrganizationId])
  useEffect(() => {
    void loadDetail(selectedId)
  }, [loadDetail, selectedId])

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return conversations
    return conversations.filter((conversation) =>
      conversation.id.includes(normalized),
    )
  }, [conversations, query])

  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      setNotice(success)
      await reload()
      await loadDetail(selectedId)
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'Ação não autorizada ou indisponível.',
      )
    } finally {
      setBusy(false)
    }
  }

  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ?? null
  return (
    <section className="nexo-inbox" aria-label="Inbox operacional">
      <header className="nexo-page-header">
        <div>
          <p className="nexo-eyebrow">CANAL SIMULADOR</p>
          <h1>Inbox</h1>
          <p>
            Mensagens sintéticas, atribuições e notas são processadas pela API
            real.
          </p>
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={loading || busy}
          onClick={() => void reload()}
        >
          Atualizar
        </button>
      </header>
      {notice && (
        <p className="nexo-inbox-notice" role="status">
          {notice}
        </p>
      )}
      <div className="nexo-inbox-grid" aria-busy={loading || undefined}>
        <aside className="nexo-inbox-list" aria-label="Conversas">
          <input
            aria-label="Buscar conversa"
            value={query}
            placeholder="Buscar por identificador"
            onChange={(event) => setQuery(event.target.value)}
          />
          <div
            className="nexo-inbox-filters"
            role="tablist"
            aria-label="Estados"
          >
            {(['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  aria-selected={filter === status}
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? 'Todas' : labels[status]}
                </button>
              ),
            )}
          </div>
          {loading ? (
            <p>Carregando conversas…</p>
          ) : visible.length === 0 ? (
            <p>Nenhuma conversa neste filtro.</p>
          ) : (
            <div className="nexo-inbox-list-items">
              {visible.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={
                    conversation.id === selectedId ? 'is-selected' : ''
                  }
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <span className="nexo-inbox-avatar">C</span>
                  <span>
                    <strong>Conversa</strong>
                    <small>
                      {conversation.id.slice(0, 8)} ·{' '}
                      {labels[conversation.status]}
                    </small>
                  </span>
                  {conversation.unreadCount > 0 && (
                    <b>{conversation.unreadCount}</b>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>
        <main className="nexo-inbox-thread">
          {!detail || !selected ? (
            <p className="nexo-inbox-empty">
              Selecione uma conversa para abrir o histórico.
            </p>
          ) : (
            <>
              <header className="nexo-inbox-thread-header">
                <div>
                  <h2>{detail.contact.name}</h2>
                  <p>
                    {detail.contact.phone ??
                      detail.contact.email ??
                      'Contato do simulador'}{' '}
                    · {detail.inbox.name}
                  </p>
                </div>
                <span
                  className={`nexo-inbox-status status-${detail.conversation.status.toLowerCase()}`}
                >
                  {labels[detail.conversation.status]}
                </span>
              </header>
              <div className="nexo-inbox-timeline">
                {detail.messages.map((message) => (
                  <article
                    className={`nexo-message ${message.direction === 'OUTBOUND' ? 'is-outbound' : ''}`}
                    key={message.id}
                  >
                    <p>{message.body ?? 'Mensagem sem texto'}</p>
                    <small>
                      {new Date(message.createdAt).toLocaleString('pt-BR')} ·{' '}
                      {message.status}
                    </small>
                  </article>
                ))}
                {detail.notes.map((item) => (
                  <article className="nexo-note" key={item.id}>
                    <strong>Nota interna</strong>
                    <p>{item.body}</p>
                    <small>
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
                    </small>
                  </article>
                ))}
                {detail.messages.length === 0 && detail.notes.length === 0 && (
                  <p>Nenhum evento nesta conversa.</p>
                )}
              </div>
              <form
                className="nexo-inbox-composer"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (composer.trim())
                    void act(
                      () =>
                        apiFetch(
                          `/v1/inbox/conversations/${selected.id}/messages`,
                          {
                            method: 'POST',
                            body: JSON.stringify({ body: composer.trim() }),
                          },
                        ),
                      'Mensagem sintética enviada.',
                    ).then(() => setComposer(''))
                }}
              >
                <label htmlFor="inbox-message">Resposta sintética</label>
                <textarea
                  id="inbox-message"
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder="Digite uma resposta"
                  maxLength={8000}
                />
                <button
                  className="button primary"
                  type="submit"
                  disabled={busy || !composer.trim()}
                >
                  Enviar
                </button>
              </form>
            </>
          )}
        </main>
        <aside className="nexo-inbox-details" aria-label="Dados da conversa">
          {!detail ? (
            <p>Dados do contato aparecerão aqui.</p>
          ) : (
            <>
              <h2>Detalhes</h2>
              <dl>
                <dt>Contato</dt>
                <dd>{detail.contact.name}</dd>
                <dt>Atendente</dt>
                <dd>{detail.assignee?.user.name ?? 'Sem atribuição'}</dd>
                <dt>Equipe</dt>
                <dd>{detail.team?.name ?? 'Não definida'}</dd>
              </dl>
              <label>
                Atribuir atendente
                <select
                  value={detail.conversation.assigneeMembershipId ?? ''}
                  disabled={busy}
                  onChange={(event) =>
                    void act(
                      () =>
                        apiFetch(
                          `/v1/inbox/conversations/${detail.conversation.id}`,
                          {
                            method: 'PATCH',
                            body: JSON.stringify({
                              assigneeMembershipId: event.target.value || null,
                            }),
                          },
                        ),
                      'Atribuição atualizada.',
                    )
                  }
                >
                  <option value="">Sem atribuição</option>
                  {members.map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estado
                <select
                  value={detail.conversation.status}
                  disabled={busy}
                  onChange={(event) =>
                    void act(
                      () =>
                        apiFetch(
                          `/v1/inbox/conversations/${detail.conversation.id}`,
                          {
                            method: 'PATCH',
                            body: JSON.stringify({
                              status: event.target.value,
                            }),
                          },
                        ),
                      'Estado atualizado.',
                    )
                  }
                >
                  {(Object.keys(labels) as Status[]).map((status) => (
                    <option key={status} value={status}>
                      {labels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <section>
                <h3>Tags</h3>
                <div className="nexo-inbox-tags">
                  {detail.tags.map((tag) => (
                    <button
                      type="button"
                      key={tag.id}
                      style={{ borderColor: tag.color ?? undefined }}
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            apiFetch(
                              `/v1/inbox/conversations/${detail.conversation.id}/tags/${tag.id}`,
                              { method: 'DELETE' },
                            ),
                          'Tag removida.',
                        )
                      }
                    >
                      {tag.name} ×
                    </button>
                  ))}
                </div>
                <select
                  defaultValue=""
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value)
                      void act(
                        () =>
                          apiFetch(
                            `/v1/inbox/conversations/${detail.conversation.id}/tags/${event.target.value}`,
                            { method: 'POST' },
                          ),
                        'Tag adicionada.',
                      ).then(() => {
                        event.target.value = ''
                      })
                  }}
                >
                  <option value="">Adicionar tag</option>
                  {allTags
                    .filter(
                      (tag) =>
                        !detail.tags.some((active) => active.id === tag.id),
                    )
                    .map((tag) => (
                      <option value={tag.id} key={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                </select>
              </section>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (note.trim())
                    void act(
                      () =>
                        apiFetch(
                          `/v1/inbox/conversations/${detail.conversation.id}/notes`,
                          {
                            method: 'POST',
                            body: JSON.stringify({ body: note.trim() }),
                          },
                        ),
                      'Nota interna criada.',
                    ).then(() => setNote(''))
                }}
              >
                <label htmlFor="inbox-note">Nota interna</label>
                <textarea
                  id="inbox-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Somente a equipe vê esta nota"
                  maxLength={8000}
                />
                <button
                  className="button secondary"
                  type="submit"
                  disabled={busy || !note.trim()}
                >
                  Adicionar nota
                </button>
              </form>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
