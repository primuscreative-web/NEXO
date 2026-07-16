import { ResourcePage } from '../../../components/resource-page'

export default function ProfilePage() {
  return (
    <ResourcePage
      title="Perfil"
      description="Identidade global independente da organização ativa."
      endpoint="/v1/auth/sessions"
      empty="Sua sessão atual aparecerá aqui."
      columns={[
        { key: 'status', label: 'Sessão' },
        { key: 'createdAt', label: 'Início' },
        { key: 'expiresAt', label: 'Expiração' },
      ]}
    />
  )
}
