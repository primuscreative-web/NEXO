import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Circle } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import {
  Alert,
  Avatar,
  Badge,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  PageState,
  PermissionState,
  Separator,
  StatCard,
  StatusIndicator,
  Table,
  Timeline,
} from '../src/display'
import {
  LoadingPage,
  Progress,
  Skeleton,
  Spinner,
  Toast,
  ToastRegion,
} from '../src/feedback'
import {
  Combobox,
  DateInput,
  describedBy,
  NativeSelect,
  RadioGroup,
  SearchInput,
  Switch,
  Textarea,
  useFilteredOptions,
} from '../src/forms'
import {
  OrganizationSwitcher,
  SelectableMenuLabel,
  UserMenu,
} from '../src/menus'
import {
  Accordion,
  Breadcrumb,
  KeyboardShortcut,
  NavigationItem,
  Pagination,
  Tabs,
} from '../src/navigation'
import {
  ConfirmationDialog,
  ContextMenu,
  Drawer,
  Popover,
  ScrollArea,
  Sheet,
  Tooltip,
} from '../src/overlays'
import { Button } from '../src/button'

describe('UI catalog coverage', () => {
  it('renders data, feedback and systemic states with semantic output', () => {
    const { rerender } = render(
      <>
        <Card>Card</Card>
        <StatCard icon={<Circle />} label="Membros" value={2} change="+1" />
        <Badge tone="primary">Primary</Badge>
        <Alert title="Info">Detalhe</Alert>
        <Alert title="Sucesso" tone="success" />
        <Alert title="Aviso" tone="warning" />
        <Alert title="Erro" tone="danger" />
        <Avatar name="Ana Nexo" />
        <Avatar name="Imagem" imageUrl="/avatar.png" size="lg" />
        <Separator orientation="vertical" />
        <Table>
          <caption>Dados</caption>
          <tbody>
            <tr>
              <td>Item</td>
            </tr>
          </tbody>
        </Table>
        <StatusIndicator label="Online" status="online" />
        <Timeline
          items={[
            { id: '1', title: 'Criado', detail: 'Detalhe', time: 'Agora' },
          ]}
        />
        <PageState
          title="Estado"
          description="Descrição"
          action={<button>Ação</button>}
        />
        <ErrorState title="Erro global" description="Falhou" />
        <PermissionState title="Acesso" description="Negado" />
        <Skeleton data-testid="skeleton" />
        <Spinner label="Processando" />
        <Progress label="Concluído" value={120} />
        <Progress label="Iniciado" value={-10} />
        <LoadingPage />
        <ToastRegion>
          <Toast
            title="Salvo"
            description="Tudo certo"
            action={<button>Fechar</button>}
          />
        </ToastRegion>
      </>,
    )
    expect(screen.getByRole('alert', { name: '' })).toHaveTextContent('Erro')
    expect(
      screen.getByRole('progressbar', { name: 'Concluído' }),
    ).toHaveAttribute('aria-valuenow', '100')
    expect(
      screen.getByRole('progressbar', { name: 'Iniciado' }),
    ).toHaveAttribute('aria-valuenow', '0')

    rerender(
      <DataTable
        caption="Pessoas"
        rows={[{ id: '1', name: 'Ana' }]}
        getRowKey={(row) => row.id}
        columns={[
          { id: 'name', header: 'Nome', cell: (row) => row.name, align: 'end' },
        ]}
        empty={<EmptyState title="Vazio" description="Sem dados" />}
      />,
    )
    expect(screen.getByRole('table', { name: 'Pessoas' })).toBeVisible()
    rerender(
      <DataTable
        caption="Pessoas"
        rows={[] as { id: string; name: string }[]}
        getRowKey={(row) => row.id}
        columns={[{ id: 'name', header: 'Nome', cell: (row) => row.name }]}
        empty={<EmptyState title="Vazio" description="Sem dados" />}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Vazio' })).toBeVisible()
  })

  it('renders form choices and exercises formatting helpers', async () => {
    const user = userEvent.setup()
    const switchChange = vi.fn()
    const radioChange = vi.fn()
    const comboChange = vi.fn()
    render(
      <>
        <Textarea aria-label="Descrição" />
        <SearchInput aria-label="Busca" />
        <DateInput aria-label="Data" />
        <NativeSelect aria-label="Densidade">
          <option>Compacta</option>
        </NativeSelect>
        <Combobox
          id="timezone"
          label="Timezone"
          options={[{ value: 'UTC', label: 'UTC' }]}
          onChange={comboChange}
        />
        <RadioGroup
          label="Tema"
          options={[
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro', disabled: true },
          ]}
          onValueChange={radioChange}
        />
        <Switch label="Ativo" onCheckedChange={switchChange} />
      </>,
    )
    await user.type(screen.getByLabelText('Timezone'), 'UTC')
    expect(comboChange).toHaveBeenLastCalledWith('UTC')
    await user.click(screen.getByRole('radio', { name: 'Claro' }))
    expect(radioChange).toHaveBeenCalledWith('light')
    await user.click(screen.getByRole('switch', { name: 'Ativo' }))
    expect(switchChange).toHaveBeenCalledWith(true)
    expect(describedBy(undefined, 'description', 'error')).toBe(
      'description error',
    )
    expect(describedBy(undefined)).toBeUndefined()
    const options = [
      { value: 'br', label: 'Brasil' },
      { value: 'pt', label: 'Portugal' },
    ]
    expect(
      renderHook(() => useFilteredOptions(options, 'bra')).result.current,
    ).toEqual([options[0]])
    expect(
      renderHook(() => useFilteredOptions(options, '')).result.current,
    ).toEqual(options)
  })

  it('covers navigation primitives and page changes', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(
      <>
        <Breadcrumb
          items={[{ label: 'NEXO', href: '/' }, { label: 'Equipe' }]}
        />
        <Tabs
          defaultValue="one"
          items={[
            { value: 'one', label: 'Um', content: <p>Primeiro</p> },
            { value: 'two', label: 'Dois', content: <p>Segundo</p> },
          ]}
        />
        <Accordion
          items={[{ id: 'a', title: 'Detalhes', content: <p>Conteúdo</p> }]}
        />
        <Pagination currentPage={2} totalPages={3} onPageChange={change} />
        <KeyboardShortcut keys={['Ctrl', 'K']} />
        <NavigationItem
          active
          href="/dashboard"
          icon={<Circle />}
          label="Dashboard"
          badge="Novo"
        />
        <NavigationItem
          disabled
          href="/admin"
          icon={<Circle />}
          label="Admin"
        />
      </>,
    )
    await user.click(screen.getByRole('tab', { name: 'Dois' }))
    expect(screen.getByText('Segundo')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Detalhes' }))
    expect(screen.getByText('Conteúdo')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    expect(change.mock.calls).toEqual([[1], [3], [1]])
    expect(screen.getByRole('link', { name: /Dashboard/u })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByText('Admin').closest('[aria-disabled="true"]'),
    ).toBeTruthy()
  })

  it('covers menus, overlays, side panels and selectors', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn()
    const menu = vi.fn()
    const organization = vi.fn()
    const { rerender } = render(
      <>
        <Tooltip content="Ajuda">
          <Button>Tooltip</Button>
        </Tooltip>
        <Popover label="Ajuda rápida" content={<p>Orientação</p>}>
          <Button>Popover</Button>
        </Popover>
        <ContextMenu
          label="Contexto"
          items={[
            { id: 'open', label: 'Abrir', shortcut: 'Enter', onSelect: menu },
          ]}
        >
          <button>Área contextual</button>
        </ContextMenu>
        <ConfirmationDialog
          title="Confirmar remoção"
          description="Ação destrutiva"
          onConfirm={confirm}
          trigger={<Button>Remover</Button>}
        />
        <ScrollArea>
          <p>Conteúdo rolável</p>
        </ScrollArea>
        <UserMenu
          name="Ana Nexo"
          email="ana@example.test"
          items={[{ id: 'profile', label: 'Perfil', onSelect: menu }]}
        />
        <OrganizationSwitcher
          value="one"
          organizations={[
            { id: 'one', name: 'Empresa', role: 'Owner' },
            { id: 'two', name: 'Outra' },
          ]}
          onChange={organization}
        />
        <SelectableMenuLabel active>Selecionado</SelectableMenuLabel>
        <SelectableMenuLabel active={false}>Inativo</SelectableMenuLabel>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Popover' }))
    expect(screen.getByText('Orientação')).toBeVisible()
    fireEvent.contextMenu(
      screen.getByRole('button', { name: 'Área contextual' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: /Abrir/u }))
    expect(menu).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Remover' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(confirm).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: /Ana Nexo/u }))
    expect(screen.getByRole('menu')).toBeVisible()

    rerender(
      <Drawer title="Drawer" trigger={<Button>Abrir drawer</Button>}>
        <p>Drawer body</p>
      </Drawer>,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir drawer' }))
    expect(screen.getByRole('dialog', { name: 'Drawer' })).toBeVisible()
    await user.keyboard('{Escape}')
    rerender(
      <Sheet title="Sheet" side="left" trigger={<Button>Abrir sheet</Button>}>
        <p>Sheet body</p>
      </Sheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir sheet' }))
    expect(screen.getByRole('dialog', { name: 'Sheet' })).toBeVisible()
  })
})
