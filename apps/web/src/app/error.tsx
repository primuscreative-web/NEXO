'use client'

import { Button, ErrorState } from '@nexo/ui'

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="nexo-public-state">
      <ErrorState
        title="Algo não saiu como esperado"
        description="Tente novamente. Se o problema continuar, informe o suporte."
        action={<Button onClick={reset}>Tentar novamente</Button>}
      />
    </main>
  )
}
