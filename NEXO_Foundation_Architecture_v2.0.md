# NEXO Foundation Architecture v2.0

**Status:** Proposta para aprovação  
**Data:** 15 de julho de 2026  
**Responsável:** Arquitetura Principal do NEXO  
**Escopo:** Baseline definitiva de arquitetura e plano da Fase 0  
**Substitui, quando houver divergência:** roadmaps e decisões de fundação presentes nos documentos v1.0

---

## 1. Propósito e autoridade

Este documento consolida a arquitetura de fundação do NEXO antes do início da implementação. Ele incorpora a documentação v1.0, as decisões aprovadas após o diagnóstico inicial e as novas decisões de Domain Driven Design, arquitetura orientada a eventos, camadas de provedores e feature flags.

O NEXO é uma plataforma SaaS Enterprise omnichannel, multiempresa e orientada por inteligência artificial para atendimento, relacionamento, vendas, automações e operação empresarial. A arquitetura deve permitir evolução incremental sem comprometer isolamento entre organizações, segurança, auditabilidade, disponibilidade ou independência de provedores.

### 1.1 Ordem de precedência

Em caso de conflito, aplica-se a seguinte ordem:

1. NEXO Constitution e requisitos de segurança.
2. Este documento, após aprovação.
3. NEXO Master Product & Engineering Specification consolidada v1.0.
4. Especificações especializadas v1.0 de banco, API, IA, voz, workflow, testes e DevOps.
5. PRD e Master Blueprint v1.0.
6. Referências Stitch, exclusivamente como direção de UX e identidade visual.

Mudanças posteriores em arquitetura, segurança, banco, contratos públicos, tenancy ou Definition of Done exigem ADR ou revisão de ADR existente antes da implementação.

### 1.2 Princípios mandatórios

- Segurança, privacidade, observabilidade e multi-tenancy por padrão.
- TypeScript em modo `strict` em todo código de produção e teste.
- DDD com Bounded Contexts e fronteiras explícitas.
- Modular Monolith como arquitetura inicial de backend.
- Comunicação síncrona por contratos públicos e comunicação assíncrona por eventos quando apropriado.
- Nenhum domínio acessa diretamente implementações internas ou tabelas privadas de outro domínio.
- API-first, contratos versionados e documentação OpenAPI.
- Provider-agnostic para IA, canais, armazenamento e demais integrações externas relevantes.
- Idempotência em operações críticas, webhooks, jobs e consumidores de eventos.
- Compatibilidade preservada ou breaking change documentada com migração.
- Código simples, reutilizável, testável e proporcional ao problema.
- Sem credenciais, tokens ou dados sensíveis no repositório.
- Nenhuma fase é concluída sem seus gates de qualidade e evidências.

---

## 2. Arquitetura final

### 2.1 Estilo arquitetural

O NEXO começará como um **Modular Monolith orientado por domínios**, implantado por meio de quatro aplicações independentes em um monorepo:

- **Web:** experiência Next.js para usuários e administradores.
- **API:** aplicação NestJS com módulos de domínio e APIs REST/WebSocket.
- **Worker:** processamento assíncrono, filas, eventos, IA, mídia e automações.
- **Webhook Gateway:** borda pública para webhooks, validação, deduplicação, normalização inicial e entrega confiável ao núcleo.

O banco PostgreSQL será compartilhado fisicamente no início, mas terá ownership lógico por contexto. Redis suportará cache, rate limiting, coordenação efêmera e BullMQ. Armazenamento de objetos será compatível com S3. Processos serão containerizados e horizontalmente escaláveis.

O monólito modular não autoriza acoplamento irrestrito. Cada contexto é tratado como possível candidato a extração futura. Contratos, eventos e ownership de dados devem possibilitar essa evolução sem reescrever regras de negócio.

### 2.2 Camadas internas de cada contexto

Cada Bounded Context seguirá, quando fizer sentido, quatro camadas:

1. **Domain:** entidades, value objects, agregados, domain services, eventos e regras invariantes; sem dependência de frameworks ou infraestrutura.
2. **Application:** casos de uso, commands, queries, ports, políticas de autorização e coordenação transacional.
3. **Infrastructure:** Prisma, filas, cache, provedores, clientes HTTP e implementações de ports.
4. **Interfaces:** controllers, schemas de transporte, consumers, presenters e adapters de entrada.

Nem todo módulo precisa de todas as abstrações. CRUD simples não deve receber complexidade artificial, mas nenhuma regra central pode ficar presa em controller, ORM ou SDK externo.

### 2.3 Fluxo de dependências

As dependências apontam para dentro:

```text
Interfaces -> Application -> Domain
Infrastructure -> Application/Domain ports
Domain -> nenhuma camada externa
```

Frameworks e provedores são detalhes externos. O domínio não importa NestJS, Prisma, BullMQ, SDKs de IA, SDKs da Meta ou bibliotecas de transporte.

### 2.4 Integração entre contextos

São permitidas:

- chamadas a contratos públicos da camada Application;
- eventos de domínio ou integração publicados no Event Bus;
- leitura por projeções explicitamente publicadas;
- APIs internas versionadas quando houver separação de processo.

São proibidas:

- importação de repositórios internos de outro contexto;
- acesso direto às tabelas pertencentes a outro contexto;
- importação de arquivos por caminhos internos não exportados;
- compartilhamento de entidades de domínio entre contextos;
- ciclos de dependência;
- uso de eventos como chamada remota síncrona disfarçada.

Objetos compartilhados serão limitados a primitivas técnicas, IDs tipados, envelopes de eventos, erros comuns e utilitários sem regras de negócio.

---

## 3. Bounded Contexts

### 3.1 Identity

Responsável por identidade global, credenciais, login, sessões, refresh token rotativo, MFA, passkeys futuras, recuperação de acesso e segurança de autenticação.

Não decide permissões de uma organização isoladamente; fornece a identidade autenticada para Organization e Platform aplicarem autorização contextual.

### 3.2 Organization

Responsável por organizações, memberships, equipes, convites, papéis, permissões, políticas ABAC, configurações por tenant e ciclo de vida organizacional.

É a fonte de verdade para a relação N:N entre `User` e `Organization` por `Membership`.

### 3.3 Inbox

Responsável por contatos operacionais, conversas, mensagens normalizadas, anexos, etiquetas, notas, atribuições, filas de atendimento, estados da conversa e tempo real.

Não conhece SDKs ou payloads específicos de WhatsApp e Instagram. Consome e produz contratos normalizados pela Channel Provider Layer.

### 3.4 CRM

Responsável por empresas, oportunidades, pipelines, estágios, atividades comerciais e visão de relacionamento. Contatos compartilhados com Inbox terão identidade canônica e contratos explícitos, sem acesso cruzado a tabelas.

### 3.5 AI

Responsável por agentes, prompts, orquestração, execução de ferramentas, memória coordenada, supervisão, políticas de confiança, custos e avaliações. Acessa modelos apenas pela AI Provider Layer.

### 3.6 Voice

Responsável por áudio, conversão, transcrição, síntese, perfis de voz, cache de voz, política de retenção, métricas e fallback de provedores.

### 3.7 Workflow

Responsável por definições, versões, publicação, triggers, nodes, execuções, variáveis, retries, delays, dead-letter handling e rollback lógico de fluxos.

### 3.8 Analytics

Responsável por ingestão de eventos analíticos, métricas, projeções, dashboards e relatórios. Deve preferir eventos e projeções, evitando consultas operacionais invasivas nos contextos produtores.

### 3.9 Billing

Responsável por planos, subscriptions, entitlements, consumo faturável, cobrança, invoices e integração com gateways. Decisões de acesso a funcionalidades são publicadas como entitlements e não consultadas diretamente em tabelas financeiras.

### 3.10 Marketplace

Responsável por catálogo, instalação, configuração, versionamento e ciclo de vida de integrações e extensões. Segredos de instalações são armazenados criptografados e referenciados, nunca retornados ao frontend.

### 3.11 Notification

Responsável por notificações internas e externas, preferências, templates, entrega, retries e histórico. Não substitui mensagens de atendimento do Inbox.

### 3.12 Knowledge

Responsável por fontes, ingestão, parsing, chunks, embeddings, indexação, versionamento, escopo, recuperação, exclusão e rastreabilidade de conhecimento. A geração de respostas continua pertencendo ao contexto AI.

### 3.13 Platform

Responsável por capacidades transversais governadas: API keys, feature flags, auditoria, configuração técnica, health, idempotency records e políticas operacionais. Observabilidade técnica é oferecida como package compartilhado, mas sua governança pertence a Platform.

### 3.14 Context map inicial

| Contexto consumidor | Contexto fornecedor | Integração preferencial                             |
| ------------------- | ------------------- | --------------------------------------------------- |
| Organization        | Identity            | contrato de identidade e eventos de usuário         |
| Inbox               | Organization        | autorização e configuração por contrato público     |
| Inbox               | Platform            | feature flags, auditoria e idempotência             |
| Inbox               | Channel Layer       | mensagens normalizadas por port                     |
| CRM                 | Inbox               | eventos de contato e conversa                       |
| AI                  | Inbox               | contexto conversacional por query pública e eventos |
| AI                  | Knowledge           | retrieval port com escopo tenant                    |
| AI                  | Organization        | políticas, limites e autorização                    |
| Voice               | AI                  | texto/resposta por contrato público ou evento       |
| Workflow            | demais contextos    | commands públicos e eventos, nunca repositórios     |
| Analytics           | todos               | eventos de integração versionados                   |
| Billing             | Organization        | lifecycle e ownership por eventos                   |
| Platform            | todos               | contratos transversais governados                   |

---

## 4. Event Bus

### 4.1 Objetivo

O Event Bus desacopla comunicação assíncrona entre contextos e prepara a arquitetura para distribuição futura. A Application Layer depende apenas de uma port, nunca de BullMQ, Redis, Kafka ou outro broker.

### 4.2 Contrato mínimo

O contrato deverá suportar:

- publicação de um ou vários eventos;
- assinatura por tipo e versão;
- envelope padronizado;
- correlação e causação;
- contexto de tenant;
- idempotência do consumidor;
- retries e dead-letter policy;
- observabilidade e propagação de trace;
- adaptadores in-memory para testes e broker-backed para execução real.

Envelope conceitual:

```text
eventId, eventType, eventVersion, occurredAt,
organizationId?, actorId?, correlationId, causationId?,
source, payload, metadata
```

`organizationId` é obrigatório para eventos tenant-owned e ausente somente em eventos realmente globais.

### 4.3 Tipos de eventos

- **Domain Event:** fato interno relevante a um agregado; pode permanecer no processo.
- **Integration Event:** contrato público, serializável, versionado e estável entre contextos/processos.

Domain Events não devem expor diretamente entidades ou detalhes internos. A conversão para Integration Event ocorre na camada Application.

### 4.4 Catálogo inicial

- `ConversationCreated.v1`
- `MessageReceived.v1`
- `MessageSent.v1`
- `ContactCreated.v1`
- `WorkflowStarted.v1`
- `WorkflowCompleted.v1`
- `AgentAssigned.v1`
- `AgentResponded.v1`
- `KnowledgeUpdated.v1`
- `AudioProcessed.v1`
- `OrganizationCreated.v1`
- `UserInvited.v1`

Cada evento terá owner, schema, semântica, política de dados sensíveis e compatibilidade documentados antes do uso.

### 4.5 Garantias e consistência

- Entrega padrão: **at least once**.
- Consumidores obrigatoriamente idempotentes.
- Ordem global não é garantida; quando necessária, usar chave de agregação e versão.
- Alterações de banco e publicação confiável usarão Transactional Outbox.
- Processamento de inbox utilizará Inbox/Processed Messages para deduplicação.
- Falhas permanentes irão para dead-letter queue com alerta e ferramenta de replay auditado.
- Consistência entre contextos será eventual e visível nos estados de UI quando relevante.

### 4.6 Versionamento

Mudanças aditivas compatíveis permanecem na mesma versão. Remoção, mudança de tipo ou semântica exige nova versão. Consumidores devem tolerar campos adicionais. Eventos não podem conter segredos nem payloads completos desnecessários.

---

## 5. Provider Layers

### 5.1 AI Provider Layer

O contexto AI define ports para capacidades, não para marcas de fornecedores:

- geração de texto e structured output;
- streaming;
- embeddings;
- uso de ferramentas;
- transcrição e síntese quando compartilhadas com Voice;
- contagem de tokens e estimativa de custo;
- modelos/capabilities disponíveis;
- cancelamento, timeout e retry policy.

Adapters traduzem contratos internos para SDKs externos. Regras de prompt, segurança, memória, supervisão e ferramentas permanecem fora dos adapters.

Seleção de provedor será baseada em capability, política da organização, região, custo, disponibilidade e feature flag. Fallback não poderá repetir automaticamente operações não idempotentes.

### 5.2 Channel Provider Layer

A camada de canais define ports normalizadas para:

- validar e interpretar webhook;
- resolver identidade do canal;
- receber mensagens e status;
- enviar texto, mídia, templates e reações suportadas;
- obter capabilities e limites;
- baixar mídia de forma segura;
- normalizar erros, delivery receipts e rate limits.

Os primeiros adapters serão WhatsApp Business Platform e Instagram Messaging por APIs oficiais da Meta. Tokens, assinaturas e payloads da Meta permanecem dentro dos adapters e do Webhook Gateway.

Inbox trabalha apenas com mensagens, participantes, conversas e capabilities normalizadas. Funcionalidades específicas de canal devem ser expostas como capabilities, nunca por condicionais espalhadas no domínio.

---

## 6. Modelo de tenancy e autorização

### 6.1 Identidade e membership

- `User` representa identidade global e não pertence exclusivamente a uma organização.
- `Organization` representa o tenant e limite primário de isolamento.
- `Membership` liga User e Organization, contendo estado, papéis e atributos contextuais.
- Um User pode participar de várias Organizations.
- Uma Organization pode possuir vários Users por Membership.
- Team membership é escopada à organização.

### 6.2 Ownership de dados

Toda entidade tenant-owned possui `organizationId` obrigatório e imutável após criação, salvo migração administrativa explícita e auditada. Entidades globais — como identidade, catálogo global ou metadados operacionais — documentam por que não possuem tenant.

O `organizationId` recebido do cliente nunca será considerado confiável isoladamente. O tenant efetivo deriva de sessão autenticada, membership ativa e contexto autorizado.

### 6.3 Isolamento em profundidade

- filtro tenant obrigatório nos repositórios;
- constraints e chaves compostas quando impedirem referência cruzada;
- políticas de autorização em casos de uso;
- testes negativos de cross-tenant access;
- tenant em cache keys, filas, logs, métricas e object storage paths;
- URLs de objetos temporárias e escopadas;
- jobs e eventos sempre carregam contexto tenant quando aplicável;
- auditoria de acesso e mudanças críticas.

Row-Level Security poderá ser adicionada como defesa adicional, sem substituir autorização na aplicação. Sua adoção será validada por domínio devido ao impacto em pooling, migrações e operações administrativas.

### 6.4 RBAC e ABAC

RBAC define capacidades gerais por papel. ABAC restringe a ação por organização, equipe, canal, recurso, propriedade, estado e demais atributos. Negação é o padrão. Autorizações críticas ocorrem no backend e não apenas na interface.

---

## 7. Feature Flags

Feature Flags são capacidade nativa do contexto Platform.

### 7.1 Escopos

- global;
- ambiente;
- plano/entitlement;
- organização;
- grupo ou membership, somente quando justificado;
- rollout percentual determinístico.

### 7.2 Regras

- funcionalidades relevantes devem possuir kill switch quando houver risco operacional;
- avaliação server-side é a fonte de verdade;
- frontend pode receber somente flags seguras e necessárias à apresentação;
- flags possuem owner, descrição, tipo, valor padrão, data de expiração e plano de remoção;
- flags não substituem autorização nem entitlements de billing;
- alterações críticas são auditadas;
- indisponibilidade do serviço usa defaults seguros;
- valores secretos nunca são armazenados como flags.

---

## 8. Estrutura definitiva do monorepo

```text
nexo/
├─ apps/
│  ├─ web/
│  ├─ api/
│  ├─ worker/
│  └─ webhook-gateway/
├─ packages/
│  ├─ database/
│  ├─ auth/
│  ├─ ai/
│  ├─ channels/
│  ├─ voice/
│  ├─ workflows/
│  ├─ events/
│  ├─ feature-flags/
│  ├─ ui/
│  ├─ config/
│  ├─ observability/
│  ├─ testing/
│  └─ shared/
├─ docs/
│  ├─ adr/
│  ├─ architecture/
│  ├─ api/
│  ├─ events/
│  ├─ reports/
│  ├─ runbooks/
│  └─ security/
├─ tooling/
│  ├─ eslint/
│  ├─ typescript/
│  └─ scripts/
├─ infrastructure/
│  ├─ docker/
│  └─ environments/
├─ .github/workflows/
├─ package.json
├─ workspace configuration
├─ task orchestration configuration
└─ README.md
```

Os Bounded Contexts residirão inicialmente em `apps/api/src/contexts` e terão exports públicos explícitos. Packages não serão criados apenas para refletir organogramas; serão extraídos quando houver reutilização real entre processos ou uma fronteira técnica estável.

`shared` será pequeno e não poderá virar depósito de regras de negócio. `database` conterá client, migrations e suporte técnico; models Prisma não serão usados como entidades de domínio. `auth` fornecerá primitives e integrações técnicas, enquanto os contextos Identity e Organization manterão suas regras.

---

## 9. Convenções de desenvolvimento

### 9.1 TypeScript e código

- `strict` e opções adicionais de segurança habilitadas.
- Sem `any` explícito, salvo boundary documentada e validada.
- Dados externos começam como `unknown` e são validados.
- Nomes de código, eventos e APIs em inglês; conteúdo de produto inicialmente em `pt-BR`.
- Composição preferida à herança.
- Imports por API pública, nunca por caminhos internos de outro contexto.
- Erros de domínio tipados e respostas HTTP padronizadas.
- Tempo, IDs, randomness e provedores externos abstraídos quando afetarem testes.

### 9.2 APIs

- REST versionado em `/v1` para operações de negócio.
- OpenAPI gerado e validado em CI.
- paginação cursor-based para feeds de grande volume; offset apenas onde adequado;
- idempotency key em comandos críticos;
- correlation ID em toda requisição;
- validação de entrada e output contracts;
- erros no formato padronizado, sem detalhes internos;
- WebSockets autenticados, autorizados e escopados por tenant;
- webhooks assinados, deduplicados e com replay protection.

### 9.3 Banco

- PostgreSQL e Prisma Migrate.
- UUIDs para entidades de negócio; estratégia exata definida no ADR-010.
- migrations imutáveis após publicação.
- foreign keys, constraints e índices explícitos.
- timestamps em UTC.
- optimistic concurrency para agregados concorridos.
- soft delete somente com requisito de recuperação ou retenção.
- JSON somente com justificativa e schema validável.
- nenhuma consulta cross-context sem contrato/projeção aprovada.

### 9.4 Eventos e jobs

- nomes no passado para fatos ocorridos;
- schemas versionados;
- consumers idempotentes;
- timeouts, retries exponenciais com jitter e limites;
- dead-letter queue observável;
- payload mínimo e sem segredos;
- correlação propagada entre request, event e job.

### 9.5 Testes

- unitários para regras e value objects;
- integração com dependências reais containerizadas para banco, Redis e filas;
- contract tests para ports e adapters;
- E2E para fluxos críticos;
- testes arquiteturais para boundaries e ciclos;
- testes negativos de autorização e isolamento tenant;
- regras de negócio com meta de pelo menos 90% de lines e branches;
- serviços críticos com meta de pelo menos 95% de lines e branches;
- correção de bug sempre inclui teste de regressão.

### 9.6 Git e documentação

- Conventional Commits.
- branches com escopo pequeno.
- ADR antes da decisão arquitetural relevante.
- documentação e changelog atualizados na mesma mudança.
- nenhum commit sem revisão do diff e execução dos gates aplicáveis.

---

## 10. Estratégia de escalabilidade

### 10.1 Aplicações stateless

API e Webhook Gateway serão stateless. Sessões, idempotência, rate limits e coordenação não dependerão de memória local. Isso permite réplicas horizontais.

### 10.2 Worker e filas

Workers serão escalados por tipo de fila, backlog, latência e custo. Concorrência terá limites por organização e provedor para evitar noisy neighbor e rate-limit externo.

### 10.3 Banco

A evolução prevista é:

1. índices e queries orientados por métricas;
2. pooling e limites de conexão;
3. read replicas para cargas analíticas compatíveis;
4. particionamento de tabelas de alto volume, como eventos e mensagens, quando medido;
5. extração de storage analítico;
6. sharding apenas diante de necessidade comprovada.

### 10.4 Cache

Cache será aplicado somente com estratégia de invalidação, TTL e chave tenant-aware. Redis não será fonte primária de verdade para dados de negócio.

### 10.5 Extração futura de serviços

Um contexto somente será extraído do monólito quando houver evidência de pelo menos um fator: necessidade de escala independente, isolamento de falhas, requisito regulatório, ritmo de entrega incompatível ou tecnologia especializada. A extração seguirá contratos existentes, outbox e migração incremental.

### 10.6 Resiliência

- timeouts explícitos;
- retries somente em falhas transitórias e operações seguras;
- circuit breakers onde integrações externas justificarem;
- bulkheads por provedor e organização;
- backpressure em filas;
- graceful shutdown;
- health/readiness checks distintos;
- degradação controlada por feature flags.

---

## 11. Segurança, privacidade e observabilidade

### 11.1 Segurança

- access token curto e refresh token rotativo;
- sessões revogáveis;
- MFA e passkeys conforme roadmap;
- hash de credenciais com algoritmo moderno e parâmetros versionados;
- segredos em cofre por ambiente;
- criptografia em trânsito e de campos sensíveis quando necessário;
- rate limiting contextual;
- dependency, secret e static analysis no CI;
- threat modeling por fluxo crítico;
- trilhas de auditoria append-oriented e protegidas contra alteração comum.

### 11.2 LGPD

Dados terão classificação, base de tratamento, finalidade, retenção e owner. Exportação, anonimização e exclusão serão workflows auditáveis. Eventos, logs e analytics não poderão replicar PII sem necessidade.

### 11.3 Observabilidade

Todos os processos produzirão logs estruturados, métricas e tracing compatíveis com OpenTelemetry. Campos mínimos incluem timestamp, service, environment, trace/correlation, tenant quando permitido, operação, resultado e erro sanitizado.

Não registrar tokens, segredos, conteúdo sensível completo, áudio ou prompts privados sem política explícita. Métricas deverão cobrir RED para serviços, filas, banco, provedores, IA, voz e webhooks.

---

## 12. Roadmap final

| Fase | Escopo                                                                       | Dependência principal           |
| ---- | ---------------------------------------------------------------------------- | ------------------------------- |
| 0    | Fundação técnica, monorepo, qualidade, CI, ambientes e documentação          | aprovação deste documento       |
| 1    | Identity, Organization, memberships, equipes, RBAC/ABAC, auditoria           | Fase 0                          |
| 2    | Design System, app shell, navegação, acessibilidade e i18n                   | Fase 1                          |
| 3    | Inbox, contatos operacionais, conversas, mensagens, anexos, filas e realtime | Fases 1–2                       |
| 4    | Channel Layer e adapters oficiais de WhatsApp/Instagram                      | Fase 3                          |
| 5    | AI, Knowledge, memória, RAG, ferramentas, supervisor e custos                | Fases 1, 3–4                    |
| 6    | Voice, STT, TTS, perfis, armazenamento e métricas                            | Fase 5                          |
| 7    | CRM e pipeline                                                               | Fases 1 e 3                     |
| 8    | Workflow Engine e monitor de automações                                      | contextos operacionais estáveis |
| 9    | Analytics, Billing, Marketplace e APIs públicas                              | eventos e domínios estáveis     |
| 10   | Hardening, performance, segurança, DR, staging e produção                    | fases anteriores                |

Cada fase será dividida em incrementos verticais pequenos. A fase não estará concluída apenas porque todos os módulos planejados começaram; todos os critérios de aceite precisam de evidência.

---

## 13. Architecture Decision Records

### ADR-001 — Monorepo

**Status:** Aceito.

**Contexto:** Quatro aplicações e múltiplas capacidades compartilham contratos, tooling e ciclos de mudança.

**Problema:** Repositórios separados aumentariam coordenação e risco de versões incompatíveis nesta etapa.

**Alternativas avaliadas:** polyrepo; monorepo sem orquestração; monorepo com workspaces e task graph.

**Decisão:** usar monorepo com workspaces, lockfile único, task orchestration, builds cacheáveis e boundaries verificáveis.

**Consequências:** mudanças atômicas e tooling consistente; CI precisa suportar tarefas afetadas e impedir dependências indevidas.

### ADR-002 — Modular Monolith

**Status:** Aceito.

**Contexto:** O produto possui muitos domínios, mas ainda não há evidência operacional para microsserviços.

**Problema:** Microsserviços antecipados elevariam custo, latência, observabilidade e consistência distribuída.

**Alternativas avaliadas:** microsserviços desde o início; monólito em camadas sem boundaries; modular monolith.

**Decisão:** backend inicial como Modular Monolith NestJS, com Worker e Webhook Gateway implantáveis separadamente.

**Consequências:** operação inicial simples e transações locais; exige disciplina, testes arquiteturais e contratos para evitar acoplamento.

### ADR-003 — Multi-tenancy

**Status:** Aceito.

**Contexto:** O NEXO é SaaS multiempresa e um usuário pode operar em mais de uma organização.

**Problema:** isolamento insuficiente causa vazamento crítico; tenancy exclusiva em User impede memberships múltiplas.

**Alternativas avaliadas:** banco por tenant; schema por tenant; tabelas compartilhadas com discriminator; combinação progressiva.

**Decisão:** tabelas compartilhadas inicialmente, `organizationId` obrigatório em dados tenant-owned, User N:N Organization por Membership e defesa em profundidade. Tenants especiais poderão receber isolamento físico futuro.

**Consequências:** eficiência operacional e onboarding simples; todas as queries, caches, jobs e eventos precisam ser tenant-aware e testados contra acesso cruzado.

### ADR-004 — Domain Driven Design

**Status:** Aceito.

**Contexto:** O produto combina identidades, comunicação, CRM, IA, automação, billing e analytics com ritmos distintos.

**Problema:** um modelo único compartilhado criaria ambiguidade e acoplamento crescente.

**Alternativas avaliadas:** organização apenas técnica; modelo de dados global; Bounded Contexts com DDD pragmático.

**Decisão:** adotar os treze Bounded Contexts deste documento, linguagem ubíqua por contexto e camadas proporcionais à complexidade.

**Consequências:** ownership claro e extração futura viável; requer context map, contratos e prevenção de abstrações cerimoniais.

### ADR-005 — Event Bus

**Status:** Aceito.

**Contexto:** Muitos fatos de negócio interessam a múltiplos contextos e processos assíncronos.

**Problema:** chamadas diretas criariam acoplamento temporal e cadeias frágeis.

**Alternativas avaliadas:** chamadas síncronas apenas; dependência direta de broker; port abstrata com adapters.

**Decisão:** Event Bus abstrato, eventos versionados, entrega at least once, consumidores idempotentes e Transactional Outbox para publicação confiável.

**Consequências:** desacoplamento e escalabilidade; consistência eventual, deduplicação, DLQ, tracing e governança de schemas tornam-se obrigatórios.

### ADR-006 — AI Provider Layer

**Status:** Aceito.

**Contexto:** Modelos variam em capacidade, custo, região e disponibilidade.

**Problema:** dependência direta de SDK tornaria regras de negócio e prompts presos ao fornecedor.

**Alternativas avaliadas:** provedor único; framework genérico externo como núcleo; ports próprias orientadas a capabilities.

**Decisão:** criar ports próprias e adapters por provedor, com seleção por capability e política.

**Consequências:** portabilidade e fallback; diferenças reais entre modelos precisam ser representadas sem buscar um denominador comum pobre.

### ADR-007 — Channel Provider Layer

**Status:** Aceito.

**Contexto:** Inbox deve suportar vários canais com capacidades e payloads diferentes.

**Problema:** condicionais específicas da Meta dentro do Inbox impediriam evolução e testes isolados.

**Alternativas avaliadas:** lógica por canal dentro do Inbox; serviço externo único; ports e adapters normalizados.

**Decisão:** Channel Provider Layer com adapters oficiais de WhatsApp e Instagram como primeiras implementações.

**Consequências:** Inbox independente e novos canais incrementais; o modelo de capabilities e mapeamento de identidades exige governança.

### ADR-008 — Autenticação

**Status:** Decisão arquitetural aceita; implementação específica será fechada na Fase 1.

**Contexto:** São necessários JWT curto, refresh rotativo, sessões revogáveis, MFA e passkeys futuras.

**Problema:** implementação própria completa aumenta superfície de segurança; fornecedor externo aumenta dependência e custo.

**Alternativas avaliadas:** autenticação totalmente própria; SaaS externo; biblioteca/framework self-hosted com adapters.

**Decisão:** o domínio Identity será próprio e provider-agnostic; armazenamento ou verificação de credenciais poderá usar adapter aprovado. Tokens e sessões obedecerão aos contratos NEXO. A escolha do adapter será feita por threat model e avaliação build-versus-buy na Fase 1.

**Consequências:** preserva portabilidade sem improvisar segurança; a Fase 1 não começa a implementação de credenciais antes da decisão do adapter.

### ADR-009 — Feature Flags

**Status:** Aceito.

**Contexto:** Funcionalidades precisam de rollout, kill switch e habilitação por organização.

**Problema:** condicionais estáticas e deploys para cada tenant são inseguros e pouco escaláveis.

**Alternativas avaliadas:** variáveis de ambiente; solução SaaS desde o início; serviço interno com adapter substituível.

**Decisão:** capability interna no Platform com port de avaliação, persistência inicial própria e possibilidade de adapter futuro.

**Consequências:** controle por tenant e defaults seguros; flags exigem lifecycle e não podem substituir autorização ou billing.

### ADR-010 — Estratégia de banco

**Status:** Aceito.

**Contexto:** O sistema precisa de integridade transacional, multi-tenancy, busca e alto volume de mensagens/eventos.

**Problema:** múltiplos bancos antecipados complicariam consistência; schema compartilhado sem ownership criaria acoplamento.

**Alternativas avaliadas:** banco por contexto desde o início; NoSQL primário; PostgreSQL compartilhado com ownership lógico.

**Decisão:** PostgreSQL como fonte primária, Prisma ORM/Migrate, schema físico compartilhado inicialmente, tabelas com owner de contexto, constraints reais, migrations imutáveis e acesso somente pelo contexto proprietário. Extensões como vetores serão avaliadas por capability.

**Consequências:** transações e operação simples; disciplina de ownership, revisão de migrations e prevenção de queries cross-context são obrigatórias.

### ADR-011 — Estratégia de observabilidade

**Status:** Aceito.

**Contexto:** API, filas, IA, voz, canais e workflows precisam de rastreabilidade ponta a ponta.

**Problema:** logs isolados não explicam fluxos distribuídos nem custos por tenant/agente.

**Alternativas avaliadas:** logs textuais; SDKs proprietários espalhados; OpenTelemetry com adapters de exportação.

**Decisão:** instrumentação padronizada em OpenTelemetry para traces, metrics e logs estruturados, com correlation/causation propagation e exporters configuráveis.

**Consequências:** independência de backend e diagnóstico completo; exige política de cardinalidade, sanitização de PII e budgets de telemetria.

---

## 14. Riscos técnicos

| Risco                                           |        Probabilidade | Impacto | Mitigação                                                            |
| ----------------------------------------------- | -------------------: | ------: | -------------------------------------------------------------------- |
| Vazamento cross-tenant                          |                média | crítico | repositories tenant-aware, constraints, testes negativos e auditoria |
| Acoplamento entre contextos                     |                 alta |    alto | public APIs, testes arquiteturais, context map e ownership           |
| Eventos duplicados ou fora de ordem             |                 alta |    alto | idempotência, aggregate version, outbox e inbox                      |
| Event Bus virar infraestrutura dominante        |                média |    alto | port própria e separação domain/integration events                   |
| Lock-in de IA                                   |                 alta |    alto | capability ports, adapters e contract tests                          |
| Diferenças entre canais vazarem no Inbox        |                média |    alto | normalized model e capability negotiation                            |
| Custo e latência de IA                          |                 alta |    alto | budgets, observabilidade, caching seguro, roteamento e flags         |
| Complexidade excessiva de DDD                   |                média |   médio | DDD pragmático e abstrações apenas onde agregam valor                |
| Schema compartilhado incentivar acesso indevido |                 alta |    alto | ownership, lint/architecture tests e revisão de migrations           |
| Noisy neighbor em filas e APIs                  |                média |    alto | quotas, concorrência por tenant, rate limits e backpressure          |
| PII em logs/eventos                             |                média | crítico | classificação, sanitização, schemas mínimos e testes                 |
| Protótipos Stitch virarem código produtivo      |                média |   médio | reimplementação em componentes acessíveis e tokens semânticos        |
| Dependências vulneráveis                        |                média |    alto | lockfile, atualização automatizada, scans e SBOM                     |
| Repositório herdar Git do perfil Windows        | alta no estado atual | crítico | inicializar e validar repositório isolado antes de qualquer commit   |
| PRD ainda incompleto                            |                 alta |    alto | critérios por fase e refinamento antes de cada domínio               |

---

## 15. Plano detalhado da Fase 0

### 15.1 Objetivo

Entregar uma fundação técnica reproduzível, segura, observável e testável para as fases de produto, sem implementar funcionalidades de negócio, autenticação, canais ou IA.

### 15.2 Fora do escopo

- cadastro, login e sessões reais;
- schema funcional completo;
- Inbox, CRM, IA, voz ou workflows;
- integrações oficiais externas;
- Design System completo;
- escolha definitiva do adapter de autenticação;
- deploy de produção.

### 15.3 Sequência de trabalho

#### Etapa 0.1 — Segurança do workspace e Git

- validar os hashes e preservar a documentação fonte;
- criar repositório Git isolado na pasta NEXO;
- garantir que o Git root não seja o perfil do Windows;
- criar `.gitignore`, política de arquivos e secret scanning;
- registrar baseline documental.

**Aceite:** `git rev-parse --show-toplevel` aponta exatamente para NEXO e nenhum arquivo externo aparece no status.

#### Etapa 0.2 — Toolchain e monorepo

- registrar versões suportadas de runtime e gerenciador;
- configurar workspaces, lockfile e task orchestration;
- configurar TypeScript strict compartilhado;
- configurar lint, format, import boundaries e scripts raiz;
- criar política de atualização de dependências.

**Aceite:** instalação limpa e reproduzível; tarefas podem ser executadas na raiz e por projeto.

#### Etapa 0.3 — Shells das aplicações

- criar Web, API, Worker e Webhook Gateway mínimos;
- adicionar health/readiness endpoints onde aplicável;
- adicionar graceful shutdown;
- impedir lógica de negócio nos shells;
- validar builds independentes.

**Aceite:** quatro aplicações compilam e iniciam; health checks têm testes.

#### Etapa 0.4 — Packages fundamentais

- criar apenas packages necessários à fundação: config, observability, events, feature-flags, testing e shared mínimo;
- definir public exports;
- criar Event Bus port e adapter in-memory, sem eventos de negócio implementados;
- criar Feature Flag evaluation port e adapter seguro mínimo;
- criar contratos base para AI Provider e Channel Provider, sem SDK externo;
- adicionar testes de contrato e boundaries.

**Aceite:** nenhum package possui dependência circular; adapters são substituíveis e testados.

#### Etapa 0.5 — Dados e infraestrutura local

- configurar PostgreSQL e Redis containerizados;
- criar package database e configuração Prisma inicial;
- criar migration de fundação somente se necessária para health/infra, sem antecipar domínios;
- definir convenções de migrations, seeds e testes;
- configurar storage local compatível apenas se necessário ao smoke test.

**Aceite:** infraestrutura sobe de forma reproduzível, health checks passam e integração executa em ambiente limpo.

#### Etapa 0.6 — Observabilidade

- instrumentar OpenTelemetry básico;
- padronizar logs estruturados e correlation IDs;
- propagar contexto em request, event e job de teste;
- sanitizar dados sensíveis;
- adicionar métricas de health e execução.

**Aceite:** smoke flow demonstra correlação ponta a ponta sem PII ou segredo.

#### Etapa 0.7 — Testes e qualidade

- configurar unit, integration, architecture e E2E runners;
- configurar coverage e thresholds aplicáveis;
- adicionar testes de compilação de contratos;
- adicionar smoke E2E das aplicações;
- adicionar testes de isolamento lógico às primitives tenant-aware;
- validar builds e containers.

**Aceite:** todos os gates locais passam a partir de checkout limpo.

#### Etapa 0.8 — CI e segurança

- pipeline para format, lint, typecheck, architecture tests, unit, integration, E2E, build e security scans;
- cache seguro e tarefas afetadas sem ocultar falhas;
- secret scan, dependency scan e geração de SBOM;
- artifacts de teste e cobertura;
- nenhuma credencial real necessária em pull requests.

**Aceite:** CI verde em branch/PR real e evidências preservadas.

#### Etapa 0.9 — Documentação operacional

- README de bootstrap;
- CONTRIBUTING e SECURITY;
- catálogo de scripts;
- template de ADR;
- visão de contexts e dependency rules;
- event conventions;
- environment matrix;
- runbooks de desenvolvimento, migration e recuperação local;
- changelog e relatório da fase.

**Aceite:** uma pessoa nova consegue instalar, executar, testar e diagnosticar a fundação apenas com a documentação.

### 15.4 Arquivos e áreas previstas

A Fase 0 poderá criar ou alterar somente:

- arquivos raiz de workspace, Git e qualidade;
- `apps/*` como shells técnicos;
- packages fundamentais listados na Etapa 0.4;
- `infrastructure/*` para ambiente local;
- `.github/workflows/*`;
- `docs/*`, README, contributing, security e changelog;
- testes associados à fundação.

Qualquer modelagem funcional de Identity, Organization ou outros contextos será adiada para sua fase, salvo primitives técnicas aprovadas e sem regra de negócio.

### 15.5 Gates obrigatórios

Ao encerrar a Fase 0, devem existir evidências de:

- instalação limpa;
- format check;
- lint;
- typecheck;
- testes arquiteturais;
- testes unitários;
- testes de integração;
- E2E smoke;
- cobertura;
- build de todos os projetos;
- validação de migrations;
- dependency/secret/static scans;
- containers e health checks;
- CI verde;
- revisão do diff;
- documentação e changelog;
- relatório da fase.

### 15.6 Entrega da Fase 0

O relatório final deverá conter resumo executivo, objetivos, decisões, arquivos, migrations, comandos, testes, cobertura, resultados de segurança, evidências de CI, riscos residuais, pendências, rollback, commit(s) sugeridos e plano da Fase 1.

---

## 16. Critérios de aprovação desta arquitetura

Esta arquitetura estará aprovada quando houver concordância explícita sobre:

- os treze Bounded Contexts;
- as regras de dependência e ownership de dados;
- Event Bus com outbox, at-least-once e idempotência;
- AI e Channel Provider Layers;
- modelo N:N de Membership e isolamento tenant;
- Feature Flags por organização;
- estrutura do monorepo;
- roadmap final;
- os onze ADRs;
- limites e critérios de aceite da Fase 0.

Nenhum código da Fase 0 deve ser implementado antes dessa aprovação.

---

## 17. Registro de consolidação

Esta versão formaliza as recomendações aprovadas após o diagnóstico inicial e resolve os conflitos anteriores da seguinte forma:

- o roadmap da Seção 12 torna-se canônico;
- `apps/worker` substitui referências a `apps/workers`;
- User e Organization relacionam-se por Membership N:N;
- `organizationId` aplica-se a dados tenant-owned, não indiscriminadamente a entidades globais;
- soft delete e JSON são seletivos;
- Inbox permanece independente de canais;
- WhatsApp e Instagram usam somente APIs oficiais;
- Fase 0 contém apenas fundação técnica;
- Design System completo começa na Fase 2;
- Modular Monolith, DDD, eventos e provider layers tornam-se decisões oficiais.

Após aprovação, este documento deverá ser preservado em `docs/architecture`, e cada ADR poderá ser materializado individualmente em `docs/adr` sem alteração de sua decisão ou significado.
