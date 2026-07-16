import { ResourcePage } from '../../../components/resource-page'

export default function SessionsPage() {
  return (
    <ResourcePage
      title="Sessões ativas"
      description="Dispositivos e sessões vinculadas à sua conta."
      endpoint="/v1/auth/sessions"
      empty="Nenhuma sessão foi encontrada."
      columns={[
        { key: 'status', label: 'Status' },
        { key: 'userAgent', label: 'Dispositivo' },
        { key: 'ipAddress', label: 'IP' },
        { key: 'lastSeenAt', label: 'Última atividade' },
      ]}
    />
  )
}
