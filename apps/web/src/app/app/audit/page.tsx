import { ResourcePage } from '../../../components/resource-page'

export default function AuditPage() {
  return (
    <ResourcePage
      title="Auditoria"
      description="Trilha append-only de ações críticas autorizadas."
      endpoint="/v1/audit-logs"
      empty="Nenhum evento auditável foi registrado."
      columns={[
        { key: 'action', label: 'Ação' },
        { key: 'resourceType', label: 'Recurso' },
        { key: 'actorUserId', label: 'Ator' },
        { key: 'createdAt', label: 'Data' },
      ]}
    />
  )
}
