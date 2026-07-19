'use client'

import { Building2, Check, ChevronDown, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from './display'
import { Select } from './forms'
import { DropdownMenu, type MenuItem } from './overlays'

export function UserMenu({
  email,
  items,
  name,
}: {
  email: string
  items: readonly MenuItem[]
  name: string
}) {
  return (
    <DropdownMenu
      items={items}
      label="Menu do usuário"
      trigger={
        <button className="nexo-user-menu" type="button">
          <Avatar name={name} size="sm" />
          <span className="nexo-user-menu__identity">
            <strong>{name}</strong>
            <small>{email}</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      }
    />
  )
}

export interface OrganizationOption {
  id: string
  name: string
  role?: string
}

export function OrganizationSwitcher({
  ariaLabel = 'Organização ativa',
  onChange,
  organizations,
  value,
}: {
  ariaLabel?: string
  onChange: (organizationId: string) => void
  organizations: readonly OrganizationOption[]
  value?: string
}) {
  return (
    <div className="nexo-org-switcher">
      <Building2 aria-hidden="true" />
      <Select
        ariaLabel={ariaLabel}
        onValueChange={onChange}
        options={organizations.map((organization) => ({
          value: organization.id,
          label: organization.role
            ? `${organization.name} · ${organization.role}`
            : organization.name,
        }))}
        placeholder="Selecionar organização"
        {...(value === undefined ? {} : { value })}
      />
    </div>
  )
}

export function SelectableMenuLabel({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <span className="nexo-selectable-label">
      {active ? <Check aria-hidden="true" /> : <UserRound aria-hidden="true" />}
      {children}
    </span>
  )
}
