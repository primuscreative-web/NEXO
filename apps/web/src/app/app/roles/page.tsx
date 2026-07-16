import { ResourcePage } from '../../../components/resource-page'

export default function RolesPage() {
  return (
    <ResourcePage
      title="Papéis e permissões"
      description="Papéis protegidos e catálogo granular de capacidades."
      endpoint="/v1/roles"
      empty="Os papéis de sistema são criados com a organização."
      columns={[
        { key: 'name', label: 'Papel' },
        { key: 'key', label: 'Chave' },
        { key: 'isProtected', label: 'Protegido' },
      ]}
    />
  )
}
