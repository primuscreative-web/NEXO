'use client'

import { Search, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { IconButton } from './button'
import { SearchInput } from './forms'
import { KeyboardShortcut } from './navigation'

export interface CommandItem {
  id: string
  label: string
  group: string
  keywords?: readonly string[]
  shortcut?: readonly string[]
  icon?: ReactNode
  disabled?: boolean
  onSelect: () => void
}

export function CommandPalette({
  emptyLabel = 'Nenhum comando encontrado.',
  items,
  onOpenChange,
  open,
  placeholder = 'Buscar comandos…',
}: {
  emptyLabel?: string
  items: readonly CommandItem[]
  onOpenChange: (open: boolean) => void
  open: boolean
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const filtered = useMemo(() => {
    const normalized = normalize(query)
    return items.filter((item) => {
      const haystack = [item.label, item.group, ...(item.keywords ?? [])]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      return haystack.includes(normalized)
    })
  }, [items, query])

  useEffect(() => {
    if (!open) setQuery('')
    setActiveIndex(0)
  }, [open, query])

  function choose(item: CommandItem | undefined) {
    if (!item || item.disabled) return
    item.onSelect()
    onOpenChange(false)
  }

  function keyboard(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(filtered[activeIndex])
    }
  }

  const groups = groupCommands(filtered)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="nexo-dialog-overlay" />
        <DialogPrimitive.Content
          className="nexo-command"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="nexo-visually-hidden">
            Paleta de comandos
          </DialogPrimitive.Title>
          <div className="nexo-command__search">
            <Search aria-hidden="true" />
            <SearchInput
              aria-activedescendant={filtered[activeIndex]?.id}
              aria-controls="nexo-command-list"
              aria-expanded="true"
              autoFocus
              placeholder={placeholder}
              role="combobox"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={keyboard}
            />
            <DialogPrimitive.Close asChild>
              <IconButton icon={<X />} label="Fechar" variant="ghost" />
            </DialogPrimitive.Close>
          </div>
          <div
            className="nexo-command__list"
            id="nexo-command-list"
            role="listbox"
          >
            {filtered.length === 0 && (
              <p className="nexo-command__empty">{emptyLabel}</p>
            )}
            {groups.map(([group, commands]) => (
              <section className="nexo-command__group" key={group}>
                <h3>{group}</h3>
                {commands.map((item) => {
                  const index = filtered.indexOf(item)
                  return (
                    <button
                      aria-disabled={item.disabled ? true : undefined}
                      aria-selected={index === activeIndex}
                      className="nexo-command__item"
                      id={item.id}
                      key={item.id}
                      role="option"
                      type="button"
                      onClick={() => choose(item)}
                      onMouseMove={() => setActiveIndex(index)}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <KeyboardShortcut keys={item.shortcut} />
                      )}
                    </button>
                  )
                })}
              </section>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function groupCommands(
  items: readonly CommandItem[],
): [string, CommandItem[]][] {
  const groups = new Map<string, CommandItem[]>()
  for (const item of items) {
    const group = groups.get(item.group) ?? []
    group.push(item)
    groups.set(item.group, group)
  }
  return [...groups.entries()]
}
