'use client'

import {
  Accordion as AccordionPrimitive,
  Tabs as TabsPrimitive,
} from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from './lib'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Navegação estrutural" className="nexo-breadcrumb">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href && !current ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <span aria-current={current ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export interface TabItem {
  value: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export function Tabs({
  defaultValue,
  items,
}: {
  defaultValue: string
  items: readonly TabItem[]
}) {
  return (
    <TabsPrimitive.Root className="nexo-tabs" defaultValue={defaultValue}>
      <TabsPrimitive.List aria-label="Seções" className="nexo-tabs__list">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="nexo-tabs__trigger"
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className="nexo-tabs__content"
          key={item.value}
          value={item.value}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export function Accordion({
  items,
}: {
  items: readonly { id: string; title: string; content: ReactNode }[]
}) {
  return (
    <AccordionPrimitive.Root type="multiple" className="nexo-accordion">
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="nexo-accordion__trigger">
              {item.title}
              <span aria-hidden="true">⌄</span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="nexo-accordion__content">
            {item.content}
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}

export function Pagination({
  currentPage,
  label = 'Paginação',
  onPageChange,
  totalPages,
}: {
  currentPage: number
  label?: string
  onPageChange: (page: number) => void
  totalPages: number
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return (
    <nav aria-label={label} className="nexo-pagination">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Anterior
      </button>
      {pages.map((page) => (
        <button
          aria-current={page === currentPage ? 'page' : undefined}
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Próxima
      </button>
    </nav>
  )
}

export function KeyboardShortcut({ keys }: { keys: readonly string[] }) {
  return (
    <span className="nexo-shortcut" aria-label={keys.join(' mais ')}>
      {keys.map((key) => (
        <kbd className="nexo-kbd" key={key}>
          {key}
        </kbd>
      ))}
    </span>
  )
}

export function NavigationItem({
  active = false,
  badge,
  disabled = false,
  href,
  icon,
  label,
}: {
  active?: boolean
  badge?: ReactNode
  disabled?: boolean
  href: string
  icon: ReactNode
  label: string
}) {
  const content = (
    <>
      <span className="nexo-nav-item__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="nexo-nav-item__label">{label}</span>
      {badge && <span className="nexo-nav-item__badge">{badge}</span>}
    </>
  )
  return disabled ? (
    <span className="nexo-nav-item" aria-disabled="true">
      {content}
    </span>
  ) : (
    <a
      className={cn('nexo-nav-item', active && 'nexo-nav-item--active')}
      href={href}
      aria-current={active ? 'page' : undefined}
    >
      {content}
    </a>
  )
}
