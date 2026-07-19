import { Wrench } from 'lucide-react'
import { SystemPage } from '../../components/system-page'

export default function MaintenancePage() {
  return (
    <SystemPage
      icon={Wrench}
      title="Manutenção programada"
      description="Esta página estrutural está pronta para comunicar uma janela de manutenção real. Nenhuma manutenção está sendo anunciada agora."
    />
  )
}
