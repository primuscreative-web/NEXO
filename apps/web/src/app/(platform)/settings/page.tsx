import { Badge, Card } from '@nexo/ui'
import {
  Building2,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'

const sections = [
  [
    '/settings/profile',
    'Perfil',
    'Dados pessoais e segurança da conta.',
    UserRound,
  ],
  [
    '/settings/organization',
    'Organização',
    'Identidade, locale e timezone.',
    Building2,
  ],
  [
    '/settings/members',
    'Pessoas e convites',
    'Memberships, convites e papéis.',
    UsersRound,
  ],
  [
    '/settings/roles',
    'Papéis e permissões',
    'Matriz de autorização da organização.',
    ShieldCheck,
  ],
  [
    '/settings/sessions',
    'Sessões',
    'Dispositivos e sessões autenticadas.',
    KeyRound,
  ],
  [
    '/settings/audit',
    'Auditoria',
    'Trilha append-only de ações críticas.',
    ScrollText,
  ],
  [
    '/settings/design-system',
    'Design System',
    'Tokens, componentes e acessibilidade.',
    Sparkles,
  ],
] as const

export default function SettingsPage() {
  return (
    <section className="nexo-page" aria-labelledby="settings-title">
      <header className="nexo-page-header">
        <div>
          <p className="nexo-eyebrow">Workspace</p>
          <h1 id="settings-title">Configurações</h1>
          <p>Administre conta, organização, acessos e preferências visuais.</p>
        </div>
      </header>
      <div className="nexo-settings-grid">
        {sections.map(([href, title, description, Icon]) => (
          <Link className="nexo-settings-link" href={href} key={href}>
            <Card>
              <Icon aria-hidden="true" />
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
              {href.endsWith('design-system') && (
                <Badge tone="ai">Interno</Badge>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
