import { ResourcePage } from '../../../../components/resource-page'

export default function RolesPage() {
  return (
    <ResourcePage
      title="Papéis e permissões"
      description="Papéis protegidos e permissões reais da organização ativa."
      endpoint="/v1/roles"
      empty="Nenhum papel está disponível para esta organização."
      columns={[
        { key: 'name', label: 'Papel' },
        { key: 'key', label: 'Identificador' },
        { key: 'isProtected', label: 'Protegido' },
      ]}
    />
  )
}
