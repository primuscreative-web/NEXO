'use client'

import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Combobox,
  ConfirmationDialog,
  ContextMenu,
  DataTable,
  DateInput,
  Dialog,
  Drawer,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FormField,
  IconButton,
  Input,
  KeyboardShortcut,
  NativeSelect,
  OrganizationSwitcher,
  Pagination,
  PasswordInput,
  PermissionState,
  Popover,
  Progress,
  RadioGroup,
  ScrollArea,
  SearchInput,
  Separator,
  Sheet,
  Skeleton,
  Spinner,
  StatCard,
  StatusIndicator,
  Switch,
  Table,
  Tabs,
  Textarea,
  Timeline,
  Toast,
  Tooltip,
  UserMenu,
} from '@nexo/ui'
import { Bell, MoreHorizontal, UsersRound } from 'lucide-react'
import { useState } from 'react'

export function UiLab() {
  const [enabled, setEnabled] = useState(true)
  const [page, setPage] = useState(1)
  return (
    <section className="nexo-page nexo-ui-lab" aria-labelledby="ui-lab-title">
      <header className="nexo-page-header nexo-page-header--hero">
        <div>
          <Badge tone="ai">Nexus Precision · v1</Badge>
          <h1 id="ui-lab-title">Design System NEXO</h1>
          <p>
            Catálogo executável de tokens, variantes, estados e comportamentos
            acessíveis consumidos pela aplicação Web.
          </p>
        </div>
        <StatusIndicator label="WCAG 2.2 AA como alvo" status="online" />
      </header>

      <LabSection
        title="Tokens semânticos"
        description="Cores nunca são escolhidas por nome de paleta dentro dos componentes."
      >
        <div className="nexo-token-grid">
          {[
            'primary',
            'secondary',
            'accent',
            'success',
            'warning',
            'danger',
            'info',
            'ai',
          ].map((token) => (
            <div className="nexo-token-swatch" data-token={token} key={token}>
              <span />
              <code>--nexo-{token}</code>
            </div>
          ))}
        </div>
      </LabSection>

      <LabSection
        title="Ações e feedback"
        description="Estados default, hover, focus-visible, loading, disabled e destructive."
      >
        <div className="nexo-lab-row">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destrutivo</Button>
          <Button loading>Salvando</Button>
          <IconButton icon={<Bell />} label="Notificações" />
        </div>
        <div className="nexo-lab-row">
          <Avatar name="Pessoa NEXO" />
          <Badge>Neutro</Badge>
          <Badge tone="success">Sucesso</Badge>
          <Badge tone="warning">Atenção</Badge>
          <Badge tone="danger">Erro</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="ai">IA</Badge>
        </div>
        <div className="nexo-lab-stack">
          <Alert title="Informação consistente">
            Mensagens usam texto e ícone, nunca apenas cor.
          </Alert>
          <Alert tone="success" title="Alteração concluída" />
          <Alert tone="warning" title="Revise antes de continuar" />
          <Alert tone="danger" title="Não foi possível salvar" />
        </div>
      </LabSection>

      <LabSection
        title="Formulários"
        description="Labels, descrições, erros e controles vinculados programaticamente."
      >
        <div className="nexo-lab-form-grid">
          <FormField label="Nome" description="Como será exibido no workspace.">
            {({ controlId, descriptionId }) => (
              <Input
                id={controlId}
                aria-describedby={descriptionId}
                placeholder="NEXO"
              />
            )}
          </FormField>
          <FormField label="Senha" error="Use pelo menos 12 caracteres.">
            {({ controlId, errorId }) => (
              <PasswordInput
                id={controlId}
                aria-invalid="true"
                aria-describedby={errorId}
              />
            )}
          </FormField>
          <FormField label="Busca global">
            {({ controlId }) => (
              <SearchInput
                id={controlId}
                placeholder="Buscar pessoas, equipes e rotas"
              />
            )}
          </FormField>
          <FormField label="Data">
            {({ controlId }) => <DateInput id={controlId} />}
          </FormField>
          <FormField label="Descrição" optional>
            {({ controlId }) => <Textarea id={controlId} />}
          </FormField>
          <FormField label="Densidade">
            {({ controlId }) => (
              <NativeSelect id={controlId} defaultValue="comfortable">
                <option value="comfortable">Confortável</option>
                <option value="compact">Compacta</option>
              </NativeSelect>
            )}
          </FormField>
          <Combobox
            id="lab-combobox"
            label="Timezone"
            options={[
              { value: 'America/Sao_Paulo', label: 'São Paulo' },
              { value: 'UTC', label: 'UTC' },
            ]}
          />
        </div>
        <div className="nexo-lab-row">
          <Checkbox
            label="Receber atualizações"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Switch
            label="Organização ativa"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <RadioGroup
            label="Tema"
            value="system"
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
        </div>
      </LabSection>

      <LabSection
        title="Dados e estados"
        description="Densidade administrativa, rolagem explícita e estados não ambíguos."
      >
        <div className="nexo-stat-grid">
          <StatCard
            icon={<UsersRound />}
            label="Membros (exemplo visual)"
            value="24"
            change="Exemplo visual do componente"
          />
          <Card>
            <Progress label="Configuração" value={68} />
          </Card>
          <Card className="nexo-lab-loading">
            <Spinner />
            <Skeleton />
          </Card>
        </div>
        <DataTable
          caption="Exemplo estrutural de membros"
          rows={[{ id: '1', name: 'Pessoa de exemplo', role: 'Agent' }]}
          getRowKey={(row) => row.id}
          columns={[
            { id: 'name', header: 'Pessoa', cell: (row) => row.name },
            {
              id: 'role',
              header: 'Papel',
              cell: (row) => <Badge>{row.role}</Badge>,
            },
          ]}
          empty={
            <EmptyState
              title="Sem dados"
              description="O estado vazio é sempre explícito."
            />
          }
        />
        <Table>
          <caption className="nexo-visually-hidden">
            Tabela semântica estrutural
          </caption>
          <thead>
            <tr>
              <th scope="col">Componente</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Table</td>
              <td>
                <StatusIndicator label="Pronto" status="online" />
              </td>
            </tr>
          </tbody>
        </Table>
      </LabSection>

      <LabSection
        title="Overlays e menus"
        description="Foco contido, Escape, restauração de foco e operação por teclado fornecidos pelos primitives."
      >
        <div className="nexo-lab-row">
          <Tooltip content="Contexto adicional sem bloquear a tarefa">
            <Button variant="outline">Tooltip</Button>
          </Tooltip>
          <Popover
            label="Ajuda rápida"
            content={<p>Conteúdo curto e contextual.</p>}
          >
            <Button variant="outline">Popover</Button>
          </Popover>
          <DropdownMenu
            label="Ações"
            trigger={
              <Button variant="outline" trailingIcon={<MoreHorizontal />}>
                Menu
              </Button>
            }
            items={[
              { id: 'edit', label: 'Editar' },
              { id: 'archive', label: 'Arquivar', destructive: true },
            ]}
          />
          <ContextMenu
            label="Menu contextual"
            items={[{ id: 'open', label: 'Abrir' }]}
          >
            <Card>Use clique direito ou teclado</Card>
          </ContextMenu>
          <Dialog
            title="Dialog acessível"
            description="O foco permanece dentro do diálogo."
            trigger={<Button variant="outline">Abrir dialog</Button>}
          >
            <p>Conteúdo do diálogo.</p>
          </Dialog>
          <ConfirmationDialog
            title="Arquivar equipe?"
            description="A equipe deixa de ficar disponível para novas associações."
            onConfirm={() => undefined}
            trigger={<Button variant="outline">Confirmar ação</Button>}
          />
          <Drawer
            title="Drawer"
            trigger={<Button variant="outline">Abrir drawer</Button>}
          >
            <p>Conteúdo adaptado para mobile.</p>
          </Drawer>
          <Sheet
            title="Sheet"
            trigger={<Button variant="outline">Abrir sheet</Button>}
          >
            <p>Painel lateral focado.</p>
          </Sheet>
        </div>
      </LabSection>

      <LabSection
        title="Navegação e composição"
        description="Padrões reutilizados no shell autenticado."
      >
        <Breadcrumb
          items={[
            { label: 'NEXO', href: '/dashboard' },
            { label: 'Design System' },
          ]}
        />
        <Tabs
          defaultValue="tokens"
          items={[
            {
              value: 'tokens',
              label: 'Tokens',
              content: <p>Primitivo → semântico → componente.</p>,
            },
            {
              value: 'a11y',
              label: 'Acessibilidade',
              content: <p>WCAG 2.2 AA.</p>,
            },
          ]}
        />
        <Accordion
          items={[
            {
              id: 'keyboard',
              title: 'Teclado',
              content: (
                <p>Todos os controles interativos funcionam sem mouse.</p>
              ),
            },
            {
              id: 'motion',
              title: 'Movimento',
              content: <p>As animações respeitam reduced motion.</p>,
            },
          ]}
        />
        <div className="nexo-lab-row">
          <KeyboardShortcut keys={['Ctrl', 'K']} />
          <Pagination
            currentPage={page}
            totalPages={3}
            onPageChange={setPage}
          />
        </div>
        <OrganizationSwitcher
          value="org-1"
          organizations={[{ id: 'org-1', name: 'NEXO', role: 'Owner' }]}
          onChange={() => undefined}
        />
        <UserMenu
          name="Pessoa NEXO"
          email="pessoa@example.test"
          items={[
            { id: 'profile', label: 'Perfil' },
            { id: 'logout', label: 'Sair', destructive: true },
          ]}
        />
      </LabSection>

      <LabSection
        title="Estados sistêmicos"
        description="Loading, vazio, erro e permissão usam contratos consistentes."
      >
        <div className="nexo-lab-state-grid">
          <EmptyState
            title="Sem equipes"
            description="Crie a primeira equipe quando tiver permissão."
          />
          <ErrorState
            title="Falha de rede"
            description="Tente novamente sem perder o contexto."
          />
          <PermissionState
            title="Acesso restrito"
            description="A autorização do backend continua soberana."
          />
        </div>
        <ScrollArea className="nexo-lab-scroll">
          <Timeline
            items={[
              {
                id: '1',
                title: 'Tema atualizado',
                detail: 'Preferência persistida no navegador.',
                time: 'Agora',
              },
              {
                id: '2',
                title: 'Tenant selecionado',
                detail: 'Cache anterior invalidado.',
              },
            ]}
          />
        </ScrollArea>
        <Separator />
        <Toast
          title="Preferências salvas"
          description="O toast é anunciado por uma região aria-live."
        />
      </LabSection>
    </section>
  )
}

function LabSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode
  description: string
  title: string
}) {
  return (
    <section className="nexo-lab-section">
      <header>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="nexo-lab-section__content">{children}</div>
    </section>
  )
}
