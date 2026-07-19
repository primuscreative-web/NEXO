import { Building2 } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function OrganizationUnavailablePage() {
  return (
    <SystemPage
      icon={Building2}
      tone="permission"
      title="Organização indisponível"
      description="Este workspace está suspenso ou arquivado. Selecione outra organização ou contate um proprietário."
      actionLabel="Trocar organização"
    />
  )
}
