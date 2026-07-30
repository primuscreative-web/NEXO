export const defaultLocale = 'pt-BR' as const
export type SupportedLocale = typeof defaultLocale

const ptBR = {
  'app.name': 'NEXO',
  'app.tagline': 'Operações conectadas',
  'common.loading': 'Carregando',
  'common.retry': 'Tentar novamente',
  'common.cancel': 'Cancelar',
  'common.close': 'Fechar',
  'common.save': 'Salvar',
  'common.search': 'Buscar',
  'common.inDevelopment': 'Em desenvolvimento',
  'common.plannedPhase': 'Planejado para a Fase {phase}',
  'nav.main': 'Navegação principal',
  'nav.overview': 'Visão geral',
  'nav.workspace': 'Operação',
  'nav.organization': 'Organização',
  'nav.dashboard': 'Dashboard',
  'nav.inbox': 'Inbox',
  'nav.crm': 'CRM',
  'nav.ai': 'Agentes',
  'nav.workflows': 'Automações',
  'nav.knowledge': 'Conhecimento',
  'nav.analytics': 'Analytics',
  'nav.integrations': 'Integrações',
  'nav.team': 'Equipe',
  'nav.settings': 'Configurações',
  'nav.profile': 'Perfil',
  'nav.organizationSettings': 'Dados da organização',
  'nav.members': 'Pessoas e convites',
  'nav.roles': 'Papéis e permissões',
  'nav.sessions': 'Sessões',
  'nav.audit': 'Auditoria',
  'nav.uiLab': 'Design System',
  'shell.skipToContent': 'Ir para o conteúdo principal',
  'shell.collapseSidebar': 'Recolher barra lateral',
  'shell.expandSidebar': 'Expandir barra lateral',
  'shell.openMenu': 'Abrir menu',
  'shell.globalSearch': 'Busca global',
  'shell.openCommands': 'Abrir paleta de comandos',
  'shell.notifications': 'Notificações',
  'shell.noNotifications': 'Nenhuma notificação disponível nesta fase',
  'shell.help': 'Ajuda',
  'shell.favorites': 'Favoritos',
  'shell.noFavorites': 'Nenhum favorito fixado',
  'shell.recent': 'Recentes',
  'shell.copilotPlanned': 'Copilot planejado para a Fase 5',
  'theme.label': 'Tema',
  'theme.light': 'Claro',
  'theme.dark': 'Escuro',
  'theme.system': 'Sistema',
  'theme.switchTo': 'Alterar tema para {theme}',
  'command.title': 'Paleta de comandos',
  'command.placeholder': 'Buscar páginas e ações…',
  'command.navigation': 'Navegação',
  'command.organization': 'Organização',
  'command.appearance': 'Aparência',
  'command.account': 'Conta',
  'command.logout': 'Sair com segurança',
  'organization.switch': 'Trocar organização',
  'organization.none': 'Nenhuma organização disponível',
  'state.sessionExpired': 'Sua sessão expirou',
  'state.sessionExpiredDescription':
    'Entre novamente para continuar com segurança.',
  'state.accessDenied': 'Acesso negado',
  'state.accessDeniedDescription':
    'Você não possui permissão para acessar este recurso.',
  'state.notFound': 'Página não encontrada',
  'state.notFoundDescription': 'O endereço informado não existe ou foi movido.',
  'state.unexpected': 'Algo não saiu como esperado',
  'state.unexpectedDescription':
    'Tente novamente. Se o problema continuar, informe o suporte.',
  'dashboard.eyebrow': 'Workspace ativo',
  'dashboard.title': 'Central de operações',
  'dashboard.description':
    'Uma visão real da fundação organizacional disponível hoje.',
  'dashboard.noOrganization': 'Selecione ou crie uma organização para começar.',
  'dashboard.realDataNotice':
    'Somente dados reais da sua organização são exibidos.',
  'future.description':
    'A estrutura desta área já está integrada ao shell, mas a funcionalidade pertence à Fase {phase}.',
  'future.badge': 'Planejado · Fase {phase}',
  'future.unavailable': '{title} ainda não está disponível',
  'future.placeholderDescription':
    'Esta rota existe para validar navegação e layout. As funcionalidades reais pertencem à Fase {phase} e nenhum dado demonstrativo é exibido como real.',
  'auth.title.login': 'Entrar no NEXO',
  'auth.title.register': 'Criar sua conta',
  'auth.title.forgot': 'Recuperar acesso',
  'auth.title.reset': 'Definir nova senha',
  'auth.title.verify': 'Confirmar seu e-mail',
  'auth.recoveryMessage':
    'Se a conta existir, enviaremos as instruções de recuperação.',
  'auth.unexpected': 'Falha inesperada.',
  'auth.brandTagline': 'Operações conectadas',
  'auth.brandTitle': 'Sua empresa, equipes e acessos em um único lugar.',
  'auth.brandDescription':
    'Identidade segura, isolamento por organização e permissões verificadas em cada ação.',
  'auth.benefitTenancy': 'Isolamento multi-tenant por padrão',
  'auth.benefitSessions': 'Sessões rotativas e auditáveis',
  'auth.benefitFoundation': 'Fundação pronta para evoluir',
  'auth.secureAccess': 'Acesso seguro',
  'auth.credentialsHelp': 'Use suas credenciais NEXO para continuar.',
  'auth.name': 'Nome completo',
  'auth.email': 'E-mail',
  'auth.recoveryToken': 'Token de recuperação',
  'auth.verificationToken': 'Token de verificação',
  'auth.password': 'Senha',
  'auth.newPassword': 'Nova senha',
  'auth.passwordHelp':
    'Use ao menos 12 caracteres, maiúscula, minúscula e número.',
  'auth.cannotContinue': 'Não foi possível continuar',
  'auth.requestReceived': 'Solicitação recebida',
  'auth.processing': 'Processando',
  'auth.connecting': 'Conectando ao servidor...',
  'auth.enter': 'Entrar',
  'auth.continue': 'Continuar',
  'auth.alternatives': 'Alternativas de acesso',
  'auth.forgotPassword': 'Esqueci minha senha',
  'auth.createAccount': 'Criar conta',
  'auth.backToLogin': 'Voltar ao login',
  'auth.passwordUpdated': 'Senha atualizada. Entre novamente.',
  'onboarding.eyebrow': 'Onboarding',
  'onboarding.title': 'Escolha seu workspace',
  'onboarding.description':
    'Cada organização possui dados, papéis e permissões isolados. Você pode alternar de contexto com segurança a qualquer momento.',
  'onboarding.select': 'Selecionar organização',
  'onboarding.emptyTitle': 'Nenhuma organização disponível',
  'onboarding.emptyDescription':
    'Crie a primeira organização para iniciar seu workspace NEXO.',
  'onboarding.newOrganization': 'Nova organização',
  'onboarding.createWorkspace': 'Criar workspace',
  'onboarding.ownerNotice': 'Você será registrado como Owner inicial.',
  'onboarding.organizationName': 'Nome da organização',
  'onboarding.slugHelp': 'Deixe vazio para gerar automaticamente.',
  'onboarding.createAndSelect': 'Criar e selecionar',
  'onboarding.createError': 'Falha ao criar organização.',
  'system.backToDashboard': 'Voltar ao Dashboard',
  'home.eyebrow': 'NEXO · FUNDAÇÃO ENTERPRISE',
  'home.title': 'Operações conectadas começam por uma fundação confiável.',
  'home.description':
    'Identidade, organizações, equipes, permissões, sessões e auditoria organizadas em um workspace seguro e acessível.',
  'dashboard.tenantNotice':
    'Os indicadores respeitam as permissões e o tenant ativo.',
  'dashboard.loadingIndicators': 'Carregando indicadores',
  'dashboard.memberships': 'Membros ativos e convidados',
  'dashboard.teams': 'Equipes',
  'dashboard.sessions': 'Sessões visíveis',
  'dashboard.audit': 'Eventos recentes carregados',
  'dashboard.quickActions': 'Ações rápidas',
  'dashboard.quickActionsDescription':
    'Operações reais disponíveis na fundação de identidade.',
  'dashboard.inviteMember': 'Convidar membro',
  'dashboard.createTeam': 'Criar equipe',
  'dashboard.reviewProfile': 'Revisar perfil',
  'dashboard.futureTitle': 'Módulos operacionais ainda não iniciados',
  'dashboard.futureDescription':
    'Inbox, CRM, IA, Voz, Workflows e Analytics permanecem explicitamente fora desta fase.',
  'dashboard.openInboxStructure': 'Ver estrutura do Inbox',
  'dashboard.loadError': 'Falha ao carregar indicadores.',
} as const

type MessageKey = keyof typeof ptBR
type Variables = Readonly<Record<string, string | number>>

export function t(key: MessageKey, variables: Variables = {}): string {
  let message: string = ptBR[key]
  for (const [name, value] of Object.entries(variables))
    message = message.replaceAll(`{${name}}`, String(value))
  return message
}

export function plural(
  count: number,
  forms: { one: string; other: string },
  locale: SupportedLocale = defaultLocale,
): string {
  const category = new Intl.PluralRules(locale).select(count)
  return (category === 'one' ? forms.one : forms.other).replaceAll(
    '{count}',
    String(count),
  )
}

export const translationNamespaces = [
  'app',
  'common',
  'nav',
  'shell',
  'theme',
  'command',
  'organization',
  'state',
  'dashboard',
  'future',
  'auth',
  'onboarding',
  'system',
  'home',
] as const
