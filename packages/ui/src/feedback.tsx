import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from './lib'

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('nexo-skeleton', className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <span className="nexo-spinner" role="status">
      <span className="nexo-visually-hidden">{label}</span>
    </span>
  )
}

export function Progress({ label, value }: { label: string; value: number }) {
  const normalized = Math.min(100, Math.max(0, value))
  return (
    <div className="nexo-progress-wrap">
      <div className="nexo-progress-label">
        <span>{label}</span>
        <span>{normalized}%</span>
      </div>
      <div
        className="nexo-progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalized}
      >
        <span
          className="nexo-progress__bar"
          style={{ '--nexo-progress': `${normalized}%` } as CSSProperties}
        />
      </div>
    </div>
  )
}

export function LoadingPage({
  label = 'Carregando conteúdo',
}: {
  label?: string
}) {
  return (
    <div className="nexo-loading-page" role="status" aria-label={label}>
      <Skeleton className="nexo-skeleton--heading" />
      <div className="nexo-loading-grid">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  )
}

export function ToastRegion({ children }: { children?: ReactNode }) {
  return (
    <div
      className="nexo-toast-region"
      role="region"
      aria-label="Notificações"
      aria-live="polite"
    >
      {children}
    </div>
  )
}

export function Toast({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description?: string
  title: string
}) {
  return (
    <div className="nexo-toast" role="status">
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
