import { ResourcePage } from '../../../../components/resource-page'

export default function AuditPage() {
  return (
    <ResourcePage
      title="Auditoria"
      description="Eventos críticos append-only no contexto da organização ativa."
      endpoint="/v1/audit-logs?limit=50"
      empty="Nenhum evento de auditoria foi registrado."
      columns={[
        { key: 'createdAt', label: 'Quando' },
        { key: 'action', label: 'Ação' },
        { key: 'resourceType', label: 'Recurso' },
        { key: 'actorUserId', label: 'Ator' },
      ]}
    />
  )
}
