import { TimerOff } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function SessionExpiredPage() {
  return (
    <SystemPage
      icon={TimerOff}
      tone="permission"
      title="Sua sessão expirou"
      description="Entre novamente para continuar com segurança."
      actionHref="/login?expired=1"
      actionLabel="Entrar novamente"
    />
  )
}
