'use client'

import { X } from 'lucide-react'
import {
  ContextMenu as ContextPrimitive,
  Dialog as DialogPrimitive,
  DropdownMenu as DropdownPrimitive,
  Popover as PopoverPrimitive,
  ScrollArea as ScrollPrimitive,
  Tooltip as TooltipPrimitive,
} from 'radix-ui'
import type { ReactNode } from 'react'
import { Button, IconButton } from './button'
import { cn } from './lib'

export function Tooltip({
  children,
  content,
}: {
  children: ReactNode
  content: ReactNode
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="nexo-tooltip" sideOffset={6}>
            {content}
            <TooltipPrimitive.Arrow className="nexo-tooltip__arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export function Popover({
  children,
  content,
  label,
}: {
  children: ReactNode
  content: ReactNode
  label: string
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-label={label}
          className="nexo-popover"
          sideOffset={8}
        >
          {content}
          <PopoverPrimitive.Arrow className="nexo-popover__arrow" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export interface MenuItem {
  id: string
  label: ReactNode
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
  shortcut?: string
}

function MenuItems({ items }: { items: readonly MenuItem[] }) {
  return items.map((item) => (
    <DropdownPrimitive.Item
      className={cn(
        'nexo-menu-item',
        item.destructive && 'nexo-menu-item--destructive',
      )}
      key={item.id}
      {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
      {...(item.onSelect ? { onSelect: item.onSelect } : {})}
    >
      <span>{item.label}</span>
      {item.shortcut ? <KeyboardVisual value={item.shortcut} /> : null}
    </DropdownPrimitive.Item>
  ))
}

export function DropdownMenu({
  items,
  label,
  trigger,
}: {
  items: readonly MenuItem[]
  label: string
  trigger: ReactNode
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          aria-label={label}
          className="nexo-menu"
          sideOffset={8}
        >
          <MenuItems items={items} />
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}

export function ContextMenu({
  children,
  items,
  label,
}: {
  children: ReactNode
  items: readonly MenuItem[]
  label: string
}) {
  return (
    <ContextPrimitive.Root>
      <ContextPrimitive.Trigger asChild>{children}</ContextPrimitive.Trigger>
      <ContextPrimitive.Portal>
        <ContextPrimitive.Content className="nexo-menu" aria-label={label}>
          {items.map((item) => (
            <ContextPrimitive.Item
              className={cn(
                'nexo-menu-item',
                item.destructive && 'nexo-menu-item--destructive',
              )}
              key={item.id}
              {...(item.disabled === undefined
                ? {}
                : { disabled: item.disabled })}
              {...(item.onSelect ? { onSelect: item.onSelect } : {})}
            >
              <span>{item.label}</span>
              {item.shortcut ? <KeyboardVisual value={item.shortcut} /> : null}
            </ContextPrimitive.Item>
          ))}
        </ContextPrimitive.Content>
      </ContextPrimitive.Portal>
    </ContextPrimitive.Root>
  )
}

export function Dialog({
  children,
  description,
  footer,
  title,
  trigger,
}: {
  children: ReactNode
  description?: string
  footer?: ReactNode
  title: string
  trigger: ReactNode
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogSurface
        {...(description === undefined ? {} : { description })}
        {...(footer === undefined ? {} : { footer })}
        title={title}
      >
        {children}
      </DialogSurface>
    </DialogPrimitive.Root>
  )
}

function DialogSurface({
  children,
  className,
  description,
  footer,
  title,
}: {
  children: ReactNode
  className?: string
  description?: string
  footer?: ReactNode
  title: string
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="nexo-dialog-overlay" />
      <DialogPrimitive.Content className={cn('nexo-dialog', className)}>
        <div className="nexo-dialog__header">
          <div>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description>
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <IconButton variant="ghost" label="Fechar" icon={<X />} />
          </DialogPrimitive.Close>
        </div>
        <div className="nexo-dialog__body">{children}</div>
        {footer && <div className="nexo-dialog__footer">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function ConfirmationDialog({
  confirmLabel = 'Confirmar',
  description,
  onConfirm,
  title,
  trigger,
}: {
  confirmLabel?: string
  description: string
  onConfirm: () => void
  title: string
  trigger: ReactNode
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogSurface
        title={title}
        description={description}
        footer={
          <>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogPrimitive.Close>
            <DialogPrimitive.Close asChild>
              <Button variant="destructive" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </DialogPrimitive.Close>
          </>
        }
      >
        <p>Esta ação deve ser confirmada antes de continuar.</p>
      </DialogSurface>
    </DialogPrimitive.Root>
  )
}

function SideDialog({
  children,
  description,
  side,
  title,
  trigger,
}: {
  children: ReactNode
  description?: string
  side: 'left' | 'right' | 'bottom'
  title: string
  trigger: ReactNode
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogSurface
        className={cn('nexo-sheet', `nexo-sheet--${side}`)}
        {...(description === undefined ? {} : { description })}
        title={title}
      >
        {children}
      </DialogSurface>
    </DialogPrimitive.Root>
  )
}

export function Drawer(props: Omit<Parameters<typeof SideDialog>[0], 'side'>) {
  return <SideDialog {...props} side="bottom" />
}

export function Sheet(
  props: Omit<Parameters<typeof SideDialog>[0], 'side'> & {
    side?: 'left' | 'right'
  },
) {
  const { side = 'right', ...rest } = props
  return <SideDialog {...rest} side={side} />
}

export function ScrollArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ScrollPrimitive.Root className={cn('nexo-scroll-area', className)}>
      <ScrollPrimitive.Viewport className="nexo-scroll-area__viewport">
        {children}
      </ScrollPrimitive.Viewport>
      <ScrollPrimitive.Scrollbar
        className="nexo-scroll-area__bar"
        orientation="vertical"
      >
        <ScrollPrimitive.Thumb className="nexo-scroll-area__thumb" />
      </ScrollPrimitive.Scrollbar>
      <ScrollPrimitive.Corner />
    </ScrollPrimitive.Root>
  )
}

function KeyboardVisual({ value }: { value: string }) {
  return <kbd className="nexo-kbd">{value}</kbd>
}
