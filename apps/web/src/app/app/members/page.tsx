import { ResourcePage } from '../../../components/resource-page'

export default function MembersPage() {
  return (
    <ResourcePage
      title="Pessoas e memberships"
      description="Membros ativos, suspensos, convidados e revogados."
      endpoint="/v1/organizations/{organizationId}/memberships"
      empty="Convide a primeira pessoa para colaborar."
      columns={[
        { key: 'user.name', label: 'Pessoa' },
        { key: 'user.email', label: 'E-mail' },
        { key: 'role.name', label: 'Papel' },
        { key: 'status', label: 'Status' },
      ]}
    />
  )
}
