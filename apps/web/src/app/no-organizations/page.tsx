import { Building2 } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function NoOrganizationsPage() {
  return (
    <SystemPage
      icon={Building2}
      title="Nenhuma organização disponível"
      description="Crie ou aceite um convite para acessar um workspace."
      actionHref="/dashboard"
      actionLabel="Criar organização"
    />
  )
}
