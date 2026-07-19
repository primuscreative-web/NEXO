import { cva, type VariantProps } from 'class-variance-authority'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LockKeyhole,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { cn, initials } from './lib'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('nexo-card', className)} {...props} />
}

export function StatCard({
  change,
  icon,
  label,
  value,
}: {
  change?: string
  icon?: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <Card className="nexo-stat-card">
      <div className="nexo-stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="nexo-stat-card__label">{label}</p>
        <p className="nexo-stat-card__value">{value}</p>
        {change && <p className="nexo-stat-card__change">{change}</p>}
      </div>
    </Card>
  )
}

export const badgeVariants = cva('nexo-badge', {
  variants: {
    tone: {
      neutral: 'nexo-badge--neutral',
      primary: 'nexo-badge--primary',
      success: 'nexo-badge--success',
      warning: 'nexo-badge--warning',
      danger: 'nexo-badge--danger',
      info: 'nexo-badge--info',
      ai: 'nexo-badge--ai',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

const alertIcons: Record<
  'info' | 'success' | 'warning' | 'danger',
  LucideIcon
> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
}

export function Alert({
  children,
  title,
  tone = 'info',
}: {
  children?: ReactNode
  title: string
  tone?: keyof typeof alertIcons
}) {
  const Icon = alertIcons[tone]
  return (
    <div
      className={cn('nexo-alert', `nexo-alert--${tone}`)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <div>{children}</div>}
      </div>
    </div>
  )
}

export function Avatar({
  imageUrl,
  name,
  size = 'md',
}: {
  imageUrl?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span className={cn('nexo-avatar', `nexo-avatar--${size}`)}>
      {imageUrl ? <img src={imageUrl} alt="" /> : initials(name)}
      <span className="nexo-visually-hidden">{name}</span>
    </span>
  )
}

export function Separator({
  orientation = 'horizontal',
}: {
  orientation?: 'horizontal' | 'vertical'
}) {
  return (
    <div
      className={cn('nexo-separator', `nexo-separator--${orientation}`)}
      role="separator"
      aria-orientation={orientation}
    />
  )
}

export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="nexo-table-wrap" tabIndex={0}>
      <table className={cn('nexo-table', className)} {...props} />
    </div>
  )
}

export interface DataColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'start' | 'center' | 'end'
}

export function DataTable<T>({
  caption,
  columns,
  empty,
  getRowKey,
  rows,
}: {
  caption: string
  columns: readonly DataColumn<T>[]
  empty: ReactNode
  getRowKey: (row: T) => string
  rows: readonly T[]
}) {
  if (rows.length === 0) return <>{empty}</>
  return (
    <Table>
      <caption className="nexo-visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.id}
              data-align={column.align ?? 'start'}
              scope="col"
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.id} data-align={column.align ?? 'start'}>
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export function StatusIndicator({
  label,
  status,
}: {
  label: string
  status: 'online' | 'offline' | 'warning' | 'busy'
}) {
  return (
    <span className="nexo-status">
      <span className={cn('nexo-status__dot', `nexo-status__dot--${status}`)} />
      {label}
    </span>
  )
}

export function Timeline({
  items,
}: {
  items: readonly {
    id: string
    title: string
    detail?: string
    time?: string
  }[]
}) {
  return (
    <ol className="nexo-timeline">
      {items.map((item) => (
        <li key={item.id}>
          <span className="nexo-timeline__marker" aria-hidden="true" />
          <div>
            <strong>{item.title}</strong>
            {item.detail && <p>{item.detail}</p>}
            {item.time && <time>{item.time}</time>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function PageState({
  action,
  description,
  icon: Icon = Info,
  title,
  tone = 'empty',
}: {
  action?: ReactNode
  description: string
  icon?: LucideIcon
  title: string
  tone?: 'empty' | 'error' | 'permission'
}) {
  return (
    <div className={cn('nexo-page-state', `nexo-page-state--${tone}`)}>
      <span className="nexo-page-state__icon">
        <Icon aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="nexo-page-state__action">{action}</div>}
    </div>
  )
}

export function EmptyState(
  props: Omit<Parameters<typeof PageState>[0], 'tone'>,
) {
  return <PageState {...props} tone="empty" />
}

export function ErrorState(
  props: Omit<Parameters<typeof PageState>[0], 'tone' | 'icon'>,
) {
  return <PageState {...props} icon={AlertCircle} tone="error" />
}

export function PermissionState(
  props: Omit<Parameters<typeof PageState>[0], 'tone' | 'icon'>,
) {
  return <PageState {...props} icon={LockKeyhole} tone="permission" />
}
