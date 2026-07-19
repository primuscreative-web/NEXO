import { Badge, EmptyState } from '@nexo/ui'
import { Construction } from 'lucide-react'
import { t } from '../lib/i18n'

export function FutureModulePage({
  description,
  phase,
  title,
}: {
  description: string
  phase: number
  title: string
}) {
  return (
    <section className="nexo-page" aria-labelledby="future-title">
      <header className="nexo-page-header">
        <div>
          <Badge tone="ai">{t('future.badge', { phase })}</Badge>
          <h1 id="future-title">{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <EmptyState
        icon={Construction}
        title={t('future.unavailable', { title })}
        description={t('future.placeholderDescription', { phase })}
      />
    </section>
  )
}
