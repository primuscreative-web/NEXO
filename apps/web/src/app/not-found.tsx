import { FileQuestion } from 'lucide-react'
import { SystemPage } from '../components/system-page'

export default function NotFound() {
  return (
    <SystemPage
      icon={FileQuestion}
      title="Página não encontrada"
      description="O endereço informado não existe ou foi movido."
    />
  )
}
