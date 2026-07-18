import { PageState, buttonVariants } from '@nexo/ui'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { t } from '../lib/i18n'

export function SystemPage({
  actionHref = '/dashboard',
  actionLabel = t('system.backToDashboard'),
  description,
  icon,
  title,
  tone = 'empty',
}: {
  actionHref?: string
  actionLabel?: string
  description: string
  icon?: LucideIcon
  title: string
  tone?: 'empty' | 'error' | 'permission'
}) {
  return (
    <main className="nexo-public-state">
      <div className="nexo-public-state__brand">NEXO</div>
      <PageState
        {...(icon ? { icon } : {})}
        title={title}
        description={description}
        tone={tone}
        action={
          <Link className={buttonVariants()} href={actionHref}>
            {actionLabel}
          </Link>
        }
      />
    </main>
  )
}
