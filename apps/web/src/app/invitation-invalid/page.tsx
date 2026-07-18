import { MailWarning } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function InvitationInvalidPage() {
  return (
    <SystemPage
      icon={MailWarning}
      tone="error"
      title="Convite inválido"
      description="O link não é válido ou já foi utilizado. Solicite um novo convite ao administrador."
      actionHref="/login"
      actionLabel="Ir para o login"
    />
  )
}
