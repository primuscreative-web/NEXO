import { ShieldX } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function AccessDeniedPage() {
  return (
    <SystemPage
      icon={ShieldX}
      tone="permission"
      title="Acesso negado"
      description="Você não possui permissão para esta ação. Solicite acesso a um administrador da organização."
    />
  )
}
