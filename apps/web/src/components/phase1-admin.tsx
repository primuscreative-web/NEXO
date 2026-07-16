'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiFetch } from '../lib/api'

interface Me {
  id: string
  email: string
  name: string
  activeOrganizationId: string | null
}
interface Role {
  id: string
  key: string
  name: string
}
interface Membership {
  id: string
  status: string
  user: { name: string; email: string }
  role: Role
}
interface Team {
  id: string
  name: string
  description: string | null
  status: string
  members: { membershipId: string }[]
}
interface Session {
  id: string
  status: string
  userAgent: string | null
  expiresAt: string
}
interface Page<T> {
  items: T[]
  nextCursor: string | null
}
type AdminMode = 'organization' | 'members' | 'teams' | 'sessions' | 'profile'

export function Phase1Admin({ mode }: { mode: AdminMode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Membership[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [organization, setOrganization] = useState<Record<
    string,
    string
  > | null>(null)
  const [notice, setNotice] = useState<{
    kind: 'error' | 'success'
    text: string
  } | null>(null)

  const reload = useCallback(async () => {
    const current = await apiFetch<Me>('/v1/auth/me')
    setMe(current)
    if (mode === 'sessions')
      return setSessions(
        (await apiFetch<Page<Session>>('/v1/auth/sessions')).items,
      )
    if (mode === 'profile') return
    if (!current.activeOrganizationId)
      throw new Error('Selecione uma organização para continuar.')
    if (mode === 'organization')
      setOrganization(
        await apiFetch(`/v1/organizations/${current.activeOrganizationId}`),
      )
    if (mode === 'members' || mode === 'teams') {
      const [nextRoles, nextMembers] = await Promise.all([
        apiFetch<Role[]>('/v1/roles'),
        apiFetch<Page<Membership>>(
          `/v1/organizations/${current.activeOrganizationId}/memberships`,
        ),
      ])
      setRoles(nextRoles)
      setMembers(nextMembers.items)
    }
    if (mode === 'teams')
      setTeams((await apiFetch<Page<Team>>('/v1/teams')).items)
  }, [mode])

  useEffect(() => {
    void reload().catch(showError)
  }, [reload])
  function showError(cause: unknown) {
    setNotice({
      kind: 'error',
      text: cause instanceof Error ? cause.message : 'Falha inesperada.',
    })
  }
  async function execute(operation: () => Promise<unknown>, text: string) {
    setNotice(null)
    try {
      await operation()
      setNotice({ kind: 'success', text })
      await reload()
    } catch (cause) {
      showError(cause)
    }
  }
  if (!me && !notice)
    return <div className="skeleton" aria-label="Carregando" />

  return (
    <section aria-labelledby="admin-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONFIGURAÇÕES</p>
          <h1 id="admin-title">{titles[mode]}</h1>
        </div>
      </div>
      {notice && (
        <p
          className={`alert ${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      {mode === 'organization' && organization && me?.activeOrganizationId && (
        <Form
          button="Salvar organização"
          submit={(data) =>
            execute(
              () =>
                apiFetch(`/v1/organizations/${me.activeOrganizationId}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    name: data.get('name'),
                    legalName: data.get('legalName'),
                    locale: data.get('locale'),
                    timezone: data.get('timezone'),
                  }),
                }),
              'Organização atualizada.',
            )
          }
        >
          <Field name="name" label="Nome" value={organization.name} required />
          <Field
            name="legalName"
            label="Razão social"
            value={organization.legalName}
          />
          <Field
            name="locale"
            label="Locale"
            value={organization.locale}
            required
          />
          <Field
            name="timezone"
            label="Fuso horário"
            value={organization.timezone}
            required
          />
        </Form>
      )}
      {mode === 'members' && me?.activeOrganizationId && (
        <>
          <Form
            button="Enviar convite"
            submit={(data) =>
              execute(
                () =>
                  apiFetch(
                    `/v1/organizations/${me.activeOrganizationId}/invitations`,
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        email: data.get('email'),
                        roleId: data.get('roleId'),
                      }),
                    },
                  ),
                'Convite enviado pelo adaptador configurado.',
              )
            }
          >
            <Field name="email" label="E-mail" type="email" required />
            <RoleSelect roles={roles} />
          </Form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.user.name}
                      <br />
                      <small>{member.user.email}</small>
                    </td>
                    <td>
                      <select
                        aria-label={`Papel de ${member.user.name}`}
                        defaultValue={member.role.id}
                        onChange={(event) =>
                          void execute(
                            () =>
                              apiFetch(`/v1/memberships/${member.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  roleId: event.target.value,
                                }),
                              }),
                            'Papel atualizado.',
                          )
                        }
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="badge">{member.status}</span>
                    </td>
                    <td>
                      <button
                        className="button ghost"
                        type="button"
                        disabled={member.status !== 'ACTIVE'}
                        onClick={() =>
                          void execute(
                            () =>
                              apiFetch(`/v1/memberships/${member.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ status: 'SUSPENDED' }),
                              }),
                            'Membership suspensa.',
                          )
                        }
                      >
                        Suspender
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {mode === 'teams' && (
        <>
          <Form
            button="Criar equipe"
            submit={(data) =>
              execute(
                () =>
                  apiFetch('/v1/teams', {
                    method: 'POST',
                    body: JSON.stringify({
                      name: data.get('name'),
                      description: data.get('description'),
                    }),
                  }),
                'Equipe criada.',
              )
            }
          >
            <Field name="name" label="Nome" required />
            <Field name="description" label="Descrição" />
          </Form>
          <div className="card-grid">
            {teams.map((team) => (
              <article className="card" key={team.id}>
                <span className="badge">{team.status}</span>
                <h2>{team.name}</h2>
                <p>{team.description ?? 'Sem descrição'}</p>
                <label>
                  Adicionar membro
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value)
                        void execute(
                          () =>
                            apiFetch(`/v1/teams/${team.id}/members`, {
                              method: 'POST',
                              body: JSON.stringify({
                                membershipId: event.target.value,
                              }),
                            }),
                          'Membro adicionado.',
                        )
                    }}
                  >
                    <option value="">Selecione</option>
                    {members
                      .filter(
                        (member) =>
                          member.status === 'ACTIVE' &&
                          !team.members.some(
                            (item) => item.membershipId === member.id,
                          ),
                      )
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.user.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    void execute(
                      () =>
                        apiFetch(`/v1/teams/${team.id}`, { method: 'DELETE' }),
                      'Equipe arquivada.',
                    )
                  }
                >
                  Arquivar
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {mode === 'sessions' && (
        <>
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              void execute(
                () =>
                  apiFetch('/v1/auth/sessions/revoke-others', {
                    method: 'POST',
                  }),
                'Outras sessões revogadas.',
              )
            }
          >
            Revogar outras sessões
          </button>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Status</th>
                  <th>Expira</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>{session.userAgent ?? 'Não identificado'}</td>
                    <td>{session.status}</td>
                    <td>
                      {new Date(session.expiresAt).toLocaleString('pt-BR')}
                    </td>
                    <td>
                      <button
                        className="button ghost"
                        type="button"
                        disabled={session.status !== 'ACTIVE'}
                        onClick={() =>
                          void execute(
                            () =>
                              apiFetch(`/v1/auth/sessions/${session.id}`, {
                                method: 'DELETE',
                              }),
                            'Sessão revogada.',
                          )
                        }
                      >
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {mode === 'profile' && me && (
        <>
          <article className="card">
            <h2>{me.name}</h2>
            <p>{me.email}</p>
          </article>
          <Form
            button="Alterar senha"
            submit={(data) =>
              execute(
                () =>
                  apiFetch('/v1/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({
                      currentPassword: data.get('currentPassword'),
                      nextPassword: data.get('nextPassword'),
                    }),
                  }),
                'Senha alterada e outras sessões revogadas.',
              )
            }
          >
            <Field
              name="currentPassword"
              label="Senha atual"
              type="password"
              required
            />
            <Field
              name="nextPassword"
              label="Nova senha"
              type="password"
              required
            />
          </Form>
        </>
      )}
    </section>
  )
}

function Form({
  submit,
  button,
  children,
}: {
  submit: (data: FormData) => void
  button: string
  children: React.ReactNode
}) {
  return (
    <form
      className="card form-card inline-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        submit(new FormData(event.currentTarget))
      }}
    >
      {children}
      <button className="button primary" type="submit">
        {button}
      </button>
    </form>
  )
}
function Field({
  name,
  label,
  value,
  type = 'text',
  required = false,
}: {
  name: string
  label: string
  value?: string | undefined
  type?: string
  required?: boolean
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={value ?? ''}
        required={required}
        minLength={type === 'password' ? 12 : undefined}
      />
    </label>
  )
}
function RoleSelect({ roles }: { roles: Role[] }) {
  return (
    <label>
      Papel
      <select name="roleId" required defaultValue="">
        <option value="" disabled>
          Selecione
        </option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </label>
  )
}
const titles: Record<AdminMode, string> = {
  organization: 'Organização atual',
  members: 'Pessoas e convites',
  teams: 'Equipes',
  sessions: 'Sessões ativas',
  profile: 'Perfil e segurança',
}
