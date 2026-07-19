import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../src/button'
import { CommandPalette, type CommandItem } from '../src/command'
import { Checkbox, FormField, Input, PasswordInput } from '../src/forms'
import { Dialog, DropdownMenu } from '../src/overlays'

describe('UI components', () => {
  it('exposes loading and disabled state without changing the button name', () => {
    render(
      <Button loading loadingLabel="Salvando">
        Salvar
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Salvando' })).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('binds form descriptions and errors to the control', () => {
    render(
      <FormField
        label="Nome"
        description="Nome público"
        error="Campo obrigatório"
      >
        {({ controlId, descriptionId, errorId }) => (
          <Input
            id={controlId}
            aria-describedby={`${descriptionId} ${errorId}`}
            aria-invalid="true"
          />
        )}
      </FormField>,
    )
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription(
      'Nome público Campo obrigatório',
    )
  })

  it('toggles password visibility from a named keyboard control', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Senha" />)
    const input = screen.getByLabelText('Senha')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('changes checkbox state from the keyboard', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(<Checkbox label="Ativo" onCheckedChange={change} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Ativo' })
    checkbox.focus()
    await user.keyboard(' ')
    expect(change).toHaveBeenCalledWith(true)
  })

  it('contains dialog focus, closes with Escape and restores focus', async () => {
    const user = userEvent.setup()
    render(
      <Dialog title="Detalhes" trigger={<Button>Abrir detalhes</Button>}>
        <Input aria-label="Nome" />
      </Dialog>,
    )
    const trigger = screen.getByRole('button', { name: 'Abrir detalhes' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Detalhes' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('operates menus and command results by keyboard', async () => {
    const user = userEvent.setup()
    const menuAction = vi.fn()
    const commandAction = vi.fn()
    const commands: CommandItem[] = [
      {
        id: 'dashboard',
        label: 'Ir para Dashboard',
        group: 'Navegação',
        onSelect: commandAction,
      },
    ]
    const { rerender } = render(
      <DropdownMenu
        label="Ações"
        trigger={<Button>Abrir ações</Button>}
        items={[{ id: 'edit', label: 'Editar', onSelect: menuAction }]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir ações' }))
    screen.getByRole('menuitem', { name: 'Editar' }).focus()
    await user.keyboard('{Enter}')
    expect(menuAction).toHaveBeenCalledOnce()

    rerender(
      <CommandPalette items={commands} open onOpenChange={() => undefined} />,
    )
    const combobox = screen.getByRole('combobox')
    await user.type(combobox, 'dashboard')
    await user.keyboard('{Enter}')
    expect(commandAction).toHaveBeenCalledOnce()
  })
})
