import { ResourcePage } from '../../../components/resource-page'

export default function OrganizationPage() {
  return (
    <ResourcePage
      title="Organização atual"
      description="Contexto ativo e dados permitidos da organização."
      endpoint="/v1/organizations"
      empty="Crie sua primeira organização na visão geral."
      columns={[
        { key: 'organization.name', label: 'Nome' },
        { key: 'organization.slug', label: 'Slug' },
        { key: 'role.name', label: 'Seu papel' },
      ]}
    />
  )
}
