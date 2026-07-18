import { MailWarning } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function InvitationExpiredPage() {
  return (
    <SystemPage
      icon={MailWarning}
      tone="error"
      title="Convite expirado"
      description="O prazo de aceite terminou. Solicite o reenvio a um administrador da organização."
      actionHref="/login"
      actionLabel="Ir para o login"
    />
  )
}
