import { ResourcePage } from '../../../components/resource-page'

export default function TeamsPage() {
  return (
    <ResourcePage
      title="Equipes"
      description="Estrutura operacional escopada à organização ativa."
      endpoint="/v1/teams"
      empty="Crie uma equipe para organizar pessoas e responsabilidades."
      columns={[
        { key: 'name', label: 'Equipe' },
        { key: 'description', label: 'Descrição' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Criada em' },
      ]}
    />
  )
}
