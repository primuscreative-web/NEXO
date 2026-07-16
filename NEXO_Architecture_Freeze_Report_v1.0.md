# NEXO Architecture Freeze Report v1.0

**Status:** Revisão crítica independente  
**Data:** 15 de julho de 2026  
**Objeto:** NEXO Foundation Architecture v2.0  
**Objetivo:** determinar se a arquitetura pode ser congelada como baseline de desenvolvimento

---

## 0. Sumário executivo

A arquitetura v2.0 está conceitualmente sólida, proporcional ao produto e muito superior a uma adoção prematura de microsserviços. Modular Monolith, monorepo, DDD pragmático, PostgreSQL, Redis/BullMQ, ports de provedores e isolamento por organização formam uma base adequada para o MVP e para crescimento relevante.

Ela ainda não deve ser congelada sem correções. A revisão adversarial encontrou oito correções obrigatórias, concentradas em fronteiras executáveis, escopo da Fase 0, tenancy, entrega confiável de eventos, uso correto de BullMQ, gates contínuos e objetivos operacionais. Nenhuma exige trocar a visão do produto ou introduzir tecnologia mais sofisticada.

O problema estrutural mais importante é que a v2.0 coloca os Bounded Contexts em `apps/api`, embora API e Worker precisem executar os mesmos casos de uso. Isso forçaria Worker a depender de outra aplicação, duplicaria lógica ou transformaria API em biblioteca. A baseline precisa colocar os módulos de contexto em packages independentes das aplicações, criados sob demanda por fase e consumidos somente por exports públicos.

Também é prematuro implementar contratos detalhados de AI Provider, Channel Provider e persistência tenant-aware de feature flags na Fase 0, antes dos requisitos reais desses domínios. Na Fase 0 devem existir os princípios e ADRs; somente o Event Bus técnico mínimo, a configuração e a observabilidade necessárias à fundação devem ser implementados.

### 0.1 Correções obrigatórias

| ID    | Correção                                                                                                                                                                                                                                  | Motivo                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| MC-01 | Mover os módulos executáveis de Bounded Contexts para `packages/contexts/<context>`, criados somente quando a fase correspondente começar                                                                                                 | API e Worker não podem depender um do outro nem duplicar regras                        |
| MC-02 | Reduzir a Fase 0: não implementar AI/Channel Provider contracts detalhados nem feature flags por organização; manter apenas ADRs, conventions e primitives técnicas comprovadamente necessárias                                           | evita abstrações especulativas e dependência de modelos ainda inexistentes             |
| MC-03 | Tornar segurança, performance, acessibilidade, observabilidade e operabilidade gates contínuos em todas as fases; Fase 10 passa a ser validação final, não início do hardening                                                            | adiar hardening acumularia dívida e risco crítico                                      |
| MC-04 | Fortalecer invariantes tenant: composite foreign keys/uniques, tenant context obrigatório, prevenção de IDOR e decisão/teste de RLS na Fase 1                                                                                             | filtro de aplicação isolado é insuficiente para risco cross-tenant                     |
| MC-05 | Especificar protocolo de Outbox/Inbox: transação atômica, leasing, estados, retries, retenção, dedupe ledger e replay auditado                                                                                                            | “usar outbox” sem protocolo não garante entrega confiável                              |
| MC-06 | Separar BullMQ de event log: BullMQ é fila de trabalho do MVP, não fonte durável de eventos de negócio; definir métricas objetivas para migração                                                                                          | QueueEvents é operacional e pode ser aparado; não substitui event store/broker durável |
| MC-07 | Adicionar objetivos operacionais iniciais mensuráveis e provisórios, com método de revisão, incluindo disponibilidade, latência, filas, RPO e RTO                                                                                         | sem targets não há capacidade de validar produção ou custo                             |
| MC-08 | Adicionar gates de dados e dependências externas por fase: classificação/retenção antes de persistir PII, auth adapter antes da Fase 1, aprovação Meta antes da Fase 4, DPIA/AI threat model antes da Fase 5 e pagamentos antes da Fase 9 | reduz risco jurídico, comercial e de retrabalho                                        |

Essas correções foram incorporadas na proposta `NEXO Foundation Architecture v2.1` entregue junto deste relatório.

---

## 1. Escopo, método e independência

A revisão releu Constitution, Security Architecture, Foundation Architecture v2.0, Master Consolidated, PRD, System Architecture, Database Architecture, API Specification, AI Architecture, Voice Architecture, Workflow Engine, Testing Strategy, DevOps & Infrastructure, Codex Implementation Plan e referências Stitch.

As decisões anteriormente aceitas foram tratadas como hipóteses, não como conclusões. A avaliação considerou:

- coerência entre documentos;
- capacidade de impor boundaries no código e nos dados;
- segurança multi-tenant;
- comportamento sob crescimento;
- custo operacional e cognitivo;
- reversibilidade de decisões;
- maturidade necessária por fase;
- riscos de integrações oficiais;
- testabilidade e observabilidade;
- prevenção de abstrações prematuras.

Fontes técnicas oficiais foram usadas apenas para validar características que afetam a decisão. PostgreSQL oferece RLS com default deny quando habilitada sem policy, mas owners e roles com `BYPASSRLS` podem contorná-la; isso impede tratar RLS como proteção automática sem desenho de roles e `FORCE ROW LEVEL SECURITY` ([PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)). PostgreSQL também oferece particionamento declarativo, mas seu benefício depende do padrão de acesso e pruning, portanto não deve ser aplicado sem métricas ([PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)). BullMQ possui deduplicação, retries e telemetry, porém seus eventos globais usam Redis Streams com retenção aparável, não sendo um ledger definitivo de fatos de negócio ([BullMQ Events](https://docs.bullmq.io/guide/events), [BullMQ Deduplication](https://docs.bullmq.io/guide/jobs/deduplication)). Prisma continua adequado como ORM, com SQL tipado/raw como escape hatch controlado para capacidades específicas do PostgreSQL; operações unsafe devem ser proibidas por padrão ([Prisma Raw Queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)).

---

## 2. Validação formal das decisões

| Decisão                          | Adequação                     | Vantagens                                                          | Limitações e riscos                                                    | Alternativas                         | Recomendação                                                             |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| Modular Monolith                 | alta                          | transações locais, deploy simples, menor custo, refatoração rápida | boundaries podem degradar; blast radius compartilhado                  | microsserviços; monólito sem módulos | **manter com ajuste MC-01**                                              |
| Monorepo                         | alta                          | mudanças atômicas, tooling comum, contracts sincronizados          | CI pode ficar lento; imports indevidos                                 | polyrepo                             | **manter** com task graph e boundary tests                               |
| Bounded Contexts                 | alta                          | ownership e linguagem claros                                       | treze contextos podem virar cerimônia se todos forem scaffoldados cedo | módulos técnicos; modelo global      | **manter**, criar cada contexto sob demanda                              |
| Context map                      | média-alta                    | expõe fornecedores/consumidores                                    | relações e tipos upstream/downstream ainda são preliminares            | dependências informais               | **ajustar** por fase e registrar contratos reais                         |
| Web/API/Worker/Webhook separados | alta                          | escala e superfície de segurança independentes                     | quatro deploys aumentam operação                                       | API única; webhook dentro da API     | **manter**; shells separados não significam lógica duplicada             |
| Event Bus interno                | alta                          | desacoplamento temporal e evolução futura                          | eventual consistency, debugging e duplicatas                           | chamadas síncronas somente           | **manter mínimo**; eventos apenas onde há fato assíncrono real           |
| Transactional Outbox             | alta para mudanças + eventos  | atomicidade entre banco e intenção de publicação                   | polling, retenção e backlog                                            | dual write; CDC                      | **manter e especificar MC-05**                                           |
| Idempotência                     | crítica                       | tolera retries/webhooks duplicados                                 | requer escopo e retenção claros                                        | “exactly once” nominal               | **manter** por endpoint, consumer e provider operation                   |
| Versionamento de eventos         | alta                          | evolução compatível                                                | governança e fixtures                                                  | eventos não versionados              | **manter**; additive-first e registry documental                         |
| Membership N:N                   | alta                          | usuário multiempresa correto                                       | sessão deve selecionar tenant ativo; convites e duplicidade complexos  | User com organizationId              | **manter**                                                               |
| RBAC + ABAC                      | alta                          | papéis simples com restrições contextuais                          | ABAC pode ficar opaco e caro                                           | RBAC puro; policy engine externo     | **manter**; começar simples, decisões deny-by-default                    |
| Feature Flags por organização    | alta                          | rollout e kill switch                                              | dívida de flags e inconsistência frontend/backend                      | env vars; SaaS externo               | **ajustar**: contrato agora, persistência tenant-aware na Fase 1/2       |
| AI Provider Layer                | alta no momento de IA         | reduz lock-in, permite routing                                     | falsa portabilidade se abstrair capacidades cedo                       | SDK direto; framework genérico       | **registrar e adiar implementação** à Fase 5                             |
| Channel Provider Layer           | alta no momento de canais     | Inbox independente e capabilities explícitas                       | diferenças da Meta não desaparecem                                     | condicionais no Inbox                | **registrar e adiar implementação** à Fase 3/4                           |
| PostgreSQL                       | alta                          | integridade, transações, JSON/vector extensions, maturidade        | tuning, vacuum e conexões em alto volume                               | MySQL; NoSQL primário                | **manter**                                                               |
| Prisma                           | média-alta                    | migrations, tipos e produtividade                                  | recursos avançados exigem SQL; risco de N+1/overfetch                  | Drizzle; SQL builder; TypeORM        | **manter**, com SQL review e escape hatch tipado                         |
| Redis                            | alta para efêmero             | cache, coordenação e BullMQ                                        | custo de memória, eviction e perda se mal configurado                  | KeyDB; Valkey; serviço gerenciado    | **manter**, nunca como fonte primária de negócio                         |
| BullMQ                           | alta até escala intermediária | simples, integrado a Node/Redis, retries/delays                    | não é log de integração de longo prazo; hot keys e memória             | RabbitMQ; NATS; Kafka                | **manter no MVP**, migrar por sinais objetivos                           |
| WebSockets                       | média-alta                    | baixa latência para Inbox                                          | fan-out, reconnect, autorização e presença complexos                   | SSE; polling                         | **manter** para bidirecional real; avaliar SSE para feeds unidirecionais |
| S3 compatível                    | alta                          | objetos privados, lifecycle e multipart                            | egress, residência e consistência operacional do fornecedor            | filesystem; blob proprietário        | **manter por port estreita**                                             |
| Next.js                          | alta                          | App Router, SSR/RSC, ecossistema React                             | cache e fronteira server/client exigem disciplina                      | Vite SPA; Remix                      | **manter**, sem acoplar domínio ao framework                             |
| NestJS                           | alta                          | módulos, DI, OpenAPI, WebSockets                                   | decorators/DI podem invadir domínio                                    | Fastify puro; Express                | **manter nas interfaces/infra**, domínio framework-free                  |
| TypeScript strict                | crítica                       | segurança e refatoração                                            | não substitui validação runtime                                        | Java/Kotlin; TS não strict           | **manter** com `unknown` nos boundaries                                  |
| Docker                           | alta                          | ambiente reproduzível                                              | builds e segurança de imagens                                          | instalação local manual              | **manter** para apps e dependências locais                               |
| CI/CD                            | crítica                       | gates reproduzíveis                                                | custo e tempo; secrets em forks                                        | validação manual                     | **manter**; Fase 0 entrega CI, CD progressivo só com ambiente            |
| Extração futura de serviços      | adequada como opção           | evolução baseada em pressão                                        | roadmap antecipado gera microsserviços artificiais                     | microsserviços desde o início        | **adiar extração** até sinais medidos                                    |

### 2.1 Conclusão da validação

Nenhuma tecnologia central precisa ser removida. Os ajustes são de fronteira, timing e garantias. A arquitetura continua deliberadamente conservadora: PostgreSQL + Redis/BullMQ são suficientes para o MVP e para o Estágio B sob dimensionamento e engenharia adequados; Estágios C–E exigem evolução progressiva, não uma promessa de escala automática.

---

## 3. Escalabilidade por estágio

Os volumes representam ordem de grandeza, não dimensionamento final. Mensagens variam radicalmente em tamanho, fan-out, anexos, áudio, uso de IA e retenção. A capacidade deve ser demonstrada por testes com distribuição realista, não apenas por média diária.

### 3.1 Estágio A — 10 empresas, 100 usuários, 10 mil mensagens/dia

| Área            | Comportamento e condições                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| API             | uma instância com redundância opcional suporta o volume; produção deve ter ao menos duas réplicas se disponibilidade for requisito |
| Banco           | PostgreSQL único gerenciado, índices tenant-aware e pooling são suficientes                                                        |
| Filas           | Redis/BullMQ único com persistência e backup apropriados; filas separadas por workload                                             |
| WebSockets      | gateway único ou duas réplicas com adapter Redis; reconexão e resume cursor                                                        |
| Armazenamento   | bucket privado S3, lifecycle e URLs assinadas                                                                                      |
| Áudio           | workers com concorrência limitada; processamento terceirizado                                                                      |
| Webhooks        | gateway stateless, assinatura, idempotency ledger e resposta rápida                                                                |
| IA/RAG          | chamadas sob demanda, quotas simples, pgvector aceitável se corpus pequeno                                                         |
| Analytics       | eventos operacionais no PostgreSQL com agregações simples; evitar duplicar conteúdo                                                |
| Observabilidade | OpenTelemetry básico, logs estruturados e alertas essenciais                                                                       |
| Custos          | dominados por IA, áudio e egress, não por compute básico                                                                           |
| Evolução        | validar padrões e custo por tenant antes de otimizar                                                                               |

Particionamento, read replicas, Kafka e microsserviços não são necessários neste estágio.

### 3.2 Estágio B — 100 empresas, 2 mil usuários, 500 mil mensagens/dia

| Área            | Comportamento e condições                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| API             | múltiplas réplicas stateless, autoscaling por CPU/latência e rate limit por tenant                               |
| Banco           | primary robusto, pooling, índices compostos e revisão contínua de queries; replica pode ser útil para relatórios |
| Filas           | Redis HA/managed, workers por workload, backpressure e quotas por organização                                    |
| WebSockets      | nós separados, pub/sub adapter, connection draining e testes de reconnect storm                                  |
| Armazenamento   | lifecycle por classe e multipart; antivírus assíncrono                                                           |
| Áudio           | pool separado, limites de tamanho/duração e circuit breaker de STT/TTS                                           |
| Webhooks        | dedupe persistente, filas por prioridade e proteção contra bursts da Meta                                        |
| IA              | roteamento por capability/custo, budgets, cache de resultados seguros e fallback controlado                      |
| RAG             | pgvector ainda possível com índices e filtros tenant; medir recall/latência                                      |
| Analytics       | projeções assíncronas; replica ou store analítico começa a ser justificável                                      |
| Observabilidade | sampling controlado e cardinalidade limitada; custo de logs monitorado                                           |
| Saturação       | conexões PostgreSQL, memória Redis, fan-out realtime e APIs externas                                             |
| Evolução        | load tests com picos de 10–20x da média e chaos de provedor                                                      |

BullMQ continua adequado se backlog, latência, memória e recuperação estiverem dentro dos objetivos.

### 3.3 Estágio C — 1.000 empresas, 20 mil usuários, 5 milhões de mensagens/dia

| Área            | Comportamento e condições                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| API             | fleets separadas por tráfego, bulkheads e limites por tenant; avaliar separar reads de realtime                     |
| Banco           | read replicas prováveis; particionamento por tempo para mensagens/eventos após prova; archiving ativo               |
| Filas           | Redis Cluster ou filas Redis isoladas por classe; avaliar broker dedicado se replay/backlog exceder operação segura |
| WebSockets      | serviço realtime candidato a extração, sharding de conexões e presença efêmera                                      |
| Armazenamento   | grande volume de objetos, inventário, lifecycle e controle de egress                                                |
| Áudio           | serviço/worker pool independente, filas e quotas dedicadas                                                          |
| Webhooks        | extração do gateway já existente, autoscaling por ingest rate e regional edge quando permitido                      |
| IA              | roteamento multi-provider real, batching onde suportado, budgets e filas por prioridade                             |
| RAG             | pgvector precisa de benchmark; store vetorial externo somente se escala/recall/operabilidade exigirem               |
| Analytics       | OLAP separado torna-se provável; CDC/outbox alimenta pipeline sem consultar OLTP pesado                             |
| Observabilidade | tail sampling, tiers de retenção e agregação; tracing integral pode ser caro                                        |
| Saturação       | write amplification, vacuum, índices globais, Redis hot keys, rate limits de fornecedores                           |
| Evolução        | extrair realtime, media e analytics antes de separar domínios transacionais sem necessidade                         |

O Estágio C é o primeiro em que particionamento e serviços especializados podem ser necessários, mas a decisão depende da forma dos picos, anexos e uso de IA.

### 3.4 Estágio D — 10 mil empresas, 200 mil usuários, 50 milhões de mensagens/dia

| Área            | Comportamento e condições                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| API             | células ou shards lógicos por tenant/região; isolamento de noisy neighbors e capacity planning formal           |
| Banco           | particionamento obrigatório para tabelas de alto volume; replicas, archival e possível distribuição por células |
| Filas           | broker de integração durável provavelmente necessário; BullMQ permanece útil para jobs locais/delays            |
| WebSockets      | plataforma realtime independente com connection routing e fan-out distribuído                                   |
| Armazenamento   | multi-bucket/cell, políticas regionais, CDN controlada para conteúdo permitido                                  |
| Áudio           | serviço dedicado com escalonamento por minutos de mídia e custo                                                 |
| Webhooks        | ingestão celular, buffers duráveis, degradação por provedor e replay operacional                                |
| IA              | gateway de IA dedicado, quotas hierárquicas, model policy, caching, batch e financial controls                  |
| RAG             | serviços de ingest/retrieval independentes; índice vetorial particionado por tenant/célula                      |
| Analytics       | pipeline streaming/OLAP independente; retenção e agregações por tier                                            |
| Observabilidade | plataforma central com sampling e budgets; logs de conteúdo separados dos técnicos                              |
| Custos          | FinOps obrigatório; IA, mídia, egress, logs e índices dominam                                                   |
| Saturação       | hotspots de tenants grandes, cross-cell queries, replay massivo e incidentes de fornecedor                      |
| Evolução        | arquitetura celular e extrações baseadas em carga; não um único cluster global                                  |

Kafka, NATS JetStream, RabbitMQ ou serviço gerenciado devem ser escolhidos pelos requisitos concretos de retenção, replay, ordering, throughput e equipe — não pelo volume diário isolado.

### 3.5 Estágio E — 100 mil empresas, milhões de usuários, centenas de milhões de mensagens/dia

| Área            | Comportamento e condições                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------- |
| API             | arquitetura celular multi-região, roteamento de tenant e controle de blast radius                   |
| Banco           | múltiplos clusters/shards por célula, catálogo global mínimo e planos explícitos de rebalanceamento |
| Filas           | backbone de eventos particionado e durável; jobs locais continuam em sistemas apropriados           |
| WebSockets      | edge/realtime global especializado e consistência de presença limitada                              |
| Armazenamento   | residência regional, replicação seletiva, lifecycle e legal holds                                   |
| Áudio           | processamento regional conforme compliance e capacidade de provedores                               |
| Webhooks        | endpoints regionais quando APIs externas permitirem; dedupe global/celular cuidadosamente definido  |
| IA              | policy gateway global com execução regional, contratos empresariais e isolamento de dados           |
| RAG             | ingestão e serving distribuídos, índices por tenant/célula e pipelines de reindexação               |
| Analytics       | lake/warehouse e streaming; separação completa do OLTP                                              |
| Observabilidade | federação, amostragem adaptativa e resposta a incidentes follow-the-sun                             |
| Custos          | unit economics por tenant e workload; commitments e routing financeiro                              |
| Saturação       | falhas correlacionadas, quotas globais, migração de shards e consistência multi-região              |
| Evolução        | programa arquitetural próprio; a baseline atual fornece boundaries, não implementação suficiente    |

A v2.1 não deve alegar suporte pronto aos Estágios D ou E. Ela apenas preserva caminhos de evolução.

### 3.6 Sinais objetivos para evolução

- p95/p99 sustentadamente fora do objetivo após otimização comprovada;
- pool de conexões ou IOPS do primary acima de 70% por janelas relevantes;
- vacuum/replication lag comprometendo operações;
- backlog de fila acima do recovery objective por mais de duas janelas consecutivas;
- Redis memory/CPU ou failover incapaz de atender RTO;
- necessidade de replay além da retenção segura do mecanismo atual;
- mais de um domínio exigindo deploy/escala independente com frequência;
- incidentes recorrentes com blast radius compartilhado;
- requisito regulatório de residência ou isolamento físico;
- custo marginal do modelo atual superior à alternativa após incluir operação e equipe.

---

## 4. Banco de dados e multi-tenancy

### 4.1 Parecer

`User N:N Organization` por `Membership` é a modelagem correta. O tenant ativo deve ser selecionado por sessão/request e validado contra membership ativa. IDs fornecidos pelo cliente nunca definem autorização.

`organizationId` deve ser obrigatório e imutável em recursos tenant-owned, fazer parte de unique constraints e, sempre que viável, de foreign keys compostas. Isso impede que um registro da organização A referencie acidentalmente um registro da organização B mesmo quando os IDs individuais são válidos.

Repositórios tenant-owned devem exigir `TenantContext` no construtor ou método; não deve existir método genérico `findById(id)` acessível a casos de uso tenant. A resposta a um ID válido de outro tenant deve ser indistinguível de recurso inexistente, salvo fluxo administrativo auditado.

RLS é recomendada como defesa adicional para tabelas de maior risco, mas a decisão operacional deve ser prototipada na Fase 1. O role usado pela aplicação não pode ser owner nem ter `BYPASSRLS`; políticas precisam de `USING` e `WITH CHECK`, testes com pooling e `FORCE ROW LEVEL SECURITY` quando apropriado. RLS não substitui autorização de domínio, pois não entende todas as regras ABAC.

### 4.2 Matriz de ownership e ciclo de vida

Retenções são classes a definir por política e contrato; números legais finais dependem de finalidade, jurisdição e clientes. “Configurável” não autoriza retenção infinita.

| Entidade ou domínio          | Ownership              |       organizationId | Estratégia de isolamento                                       | Retenção inicial orientativa         | Soft delete                             |
| ---------------------------- | ---------------------- | -------------------: | -------------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| User                         | global/Identity        |                  não | ID global; PII protegida; acesso por Identity                  | conta ativa + política LGPD          | não; desativação/anonimização           |
| Session/Refresh Token        | global com contexto    |  opcional por sessão | hash/token family, user e tenant selecionado                   | curta e ligada à expiração           | não; revogação                          |
| Organization                 | tenant root            |           próprio ID | autorização Platform/admin                                     | contrato + obrigações                | estado/inativação, não delete simples   |
| Membership                   | Organization           |                  sim | unique `(organizationId,userId)`; FK composta quando aplicável | contrato + auditoria                 | status/revogação                        |
| Team/Role/Policy             | Organization           |                  sim | repository tenant + constraints                                | vida da organização                  | seletivo                                |
| FeatureFlag override         | Platform/Organization  |                  sim | key única por tenant/ambiente                                  | até remoção da flag + auditoria      | não; versionar/expirar                  |
| Contact                      | Inbox/CRM por contrato |                  sim | IDs e uniques tenant-aware                                     | política de relacionamento/LGPD      | possível, com anonimização              |
| Conversation                 | Inbox                  |                  sim | composite FK e acesso por membership/team                      | configurável por canal/contrato      | seletivo; preferir archive              |
| Message                      | Inbox                  |                  sim | append-oriented, partition candidate                           | canal/contrato/LGPD                  | não como padrão; tombstone/anonimização |
| Attachment/Audio             | Inbox/Voice            |                  sim | object key tenant, signed URL e metadata DB                    | curta/configurável                   | lifecycle delete físico                 |
| Assignment/Note/Tag          | Inbox                  |                  sim | composite FK                                                   | acompanha conversa/auditoria         | seletivo                                |
| Company/Opportunity/Pipeline | CRM                    |                  sim | constraints e policies tenant                                  | contrato + LGPD                      | seletivo                                |
| Agent/Prompt                 | AI                     |                  sim | tenant + versioning                                            | versões ativas e histórico auditável | arquivar, não sobrescrever              |
| AI Execution                 | AI                     |                  sim | tenant, PII minimizada                                         | curta por padrão; exceção aprovada   | não; expiração/anonimização             |
| Memory                       | AI                     |                  sim | escopo tenant/contact/agent                                    | TTL por tipo e consentimento         | exclusão/anonimização obrigatória       |
| KnowledgeSource              | Knowledge              |                  sim | ACL tenant/departamento/agent                                  | enquanto fonte autorizada            | archive + purge de derivados            |
| KnowledgeChunk/Embedding     | Knowledge              |                  sim | filtro tenant obrigatório no índice                            | alinhada à fonte                     | delete físico/reindex                   |
| Workflow/Version             | Workflow               |                  sim | tenant + immutable published version                           | histórico operacional                | draft soft delete; published archive    |
| WorkflowExecution            | Workflow               |                  sim | tenant e append logs                                           | por criticidade/contrato             | não; archive/expire                     |
| Analytics Event              | Analytics              |                  sim | tenant + schema; PII minimizada                                | curta raw, longa agregada            | não; TTL/partition drop                 |
| Metric/Report                | Analytics              |                  sim | tenant e access policy                                         | agregados conforme utilidade         | seletivo                                |
| Subscription/Invoice         | Billing                |                  sim | tenant + controles financeiros                                 | obrigação fiscal/contratual          | nunca soft delete comum                 |
| Payment credential           | Billing adapter        |                  sim | tokenização; segredo fora do domínio                           | mínimo necessário                    | revogar/purge conforme provider         |
| Marketplace installation     | Marketplace            |                  sim | tenant + encrypted secret reference                            | enquanto instalada + auditoria       | status/uninstall                        |
| Notification                 | Notification           |                  sim | tenant + recipient authorization                               | curta/configurável                   | expiração                               |
| API Key                      | Platform               |                  sim | hash, scope, prefix e rotation                                 | até revogação + auditoria            | revogar, não recuperar                  |
| AuditLog                     | Platform               | sim/global explícito | append-oriented e acesso restrito                              | política legal/risco                 | não; archive imutável                   |
| Idempotency Record           | Platform/context owner |    sim quando tenant | unique scope/key/operation                                     | maior que janela de retry            | TTL/delete físico                       |
| Outbox Event                 | contexto produtor      |    sim quando tenant | mesma transação e acesso operacional                           | até entrega + janela de replay       | não; archive/purge controlado           |

### 4.3 Índices e constraints

- índices iniciam por `organizationId` quando as queries sempre filtram tenant;
- uniques naturais tornam-se `(organizationId, normalizedValue)`;
- referências cross-tenant usam `(organizationId, referencedId)` em ambos os lados;
- feeds usam `(organizationId, occurredAt, id)` para cursor estável;
- soft-deleted uniques exigem partial unique index, documentado por SQL migration;
- embeddings são filtrados por tenant antes da similaridade; filtro pós-busca é proibido;
- eventos e mensagens são candidatos a particionamento temporal somente após volume/query evidence;
- índices devem ser justificados por queries e medidos por write amplification.

### 4.4 Arquivamento e dados especiais

Mensagens antigas podem migrar para armazenamento de menor custo mantendo metadata pesquisável e legal holds. Dados financeiros são imutáveis/corrigidos por lançamentos compensatórios. Anexos e documentos usam object storage privado, malware scan e lifecycle. Embeddings são dados derivados potencialmente sensíveis: excluir/reindexar quando a fonte muda, nunca compartilhar índice sem filtro tenant.

### 4.5 Riscos de vazamento

1. lookup por ID sem tenant;
2. cache key sem organizationId;
3. job/event sem contexto tenant;
4. URL assinada gerada antes da autorização;
5. vector search com filtro aplicado após top-k;
6. unique global que permite inferência de dados;
7. admin/support path usando role que bypassa RLS;
8. logs e traces com conteúdo de mensagens;
9. export/analytics misturando tenants;
10. attachment key previsível ou reutilizado.

Todos exigem testes negativos automatizados.

---

## 5. Event Bus, Outbox e filas

### 5.1 Modelo recomendado

- Domain Events permanecem internos ao contexto e podem ser síncronos dentro da transação quando não causam side effects externos.
- Integration Events são contratos serializáveis, versionados e publicados após commit.
- A transação grava mudança de negócio e outbox row atomicamente.
- Um relay obtém lotes por lease/`SKIP LOCKED`, publica no transport, registra attempts e `publishedAt`.
- A confirmação de transporte não significa que consumidores concluíram; cada consumidor mantém inbox/deduplication ledger.
- Falhas transitórias usam exponential backoff com jitter e limite; falhas permanentes/poison messages vão para DLQ.
- Replay é operação administrativa autorizada, auditada, com dry run, range e rate limit.

### 5.2 Ordenação e compatibilidade

Não existe ordem global. Quando a ordem importa, eventos carregam `aggregateId` e `aggregateVersion`; consumidor ignora versão já aplicada, aguarda gap dentro de janela ou reconcilia pela fonte pública. Mudanças aditivas permanecem em v1; remoções ou mudança semântica criam v2. Fixtures de compatibilidade precisam rodar em CI.

### 5.3 Poison messages

Uma mensagem é poison quando repete falha determinística após o limite. Ela deve registrar erro sanitizado, schema/version, handler version e correlation, sem segredo. O sistema pausa apenas a chave/partição afetada quando possível, alerta operação e permite correção + replay. Loop infinito de retry é proibido.

### 5.4 BullMQ e Redis

BullMQ é suficiente para MVP e Estágios A–B se:

- Redis tiver persistência/HA compatível com RPO/RTO;
- business truth permanecer no PostgreSQL;
- outbox não depender de QueueEvents como ledger;
- jobs forem idempotentes;
- backlog age, failure rate, memory, stalled jobs e recovery time forem monitorados;
- filas forem separadas por classe de workload e prioridade;
- retenção de jobs não destruir a única evidência operacional.

### 5.5 Sinais para trocar ou complementar o broker

| Sinal                                                                | Tecnologia a avaliar             | Por quê                                           |
| -------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| replay longo, múltiplos consumer groups e alto throughput sequencial | Kafka/Redpanda/serviço streaming | log durável particionado e replay                 |
| routing complexo, acknowledgements e DLQ maduros com volume moderado | RabbitMQ                         | semântica de broker e roteamento                  |
| baixa latência, topologias simples e request/reply/eventing          | NATS JetStream                   | operação e protocolo leves, persistência opcional |
| workloads de jobs/delays continuam dominantes                        | manter BullMQ                    | complexidade adicional não se paga                |

A migração precisa ser motivada por métricas: retenção/replay não atendidos, backlog incompatível com recovery objective, custo/limite do Redis, consumer fan-out ou throughput sustentado não resolvido por tuning/partitioning. Volume diário isolado não decide.

---

## 6. Inteligência artificial

### 6.1 Parecer arquitetural

A AI Provider Layer é correta, desde que seja baseada em capabilities reais e criada com o primeiro caso de uso. Uma interface genérica universal na Fase 0 seria prematura: streaming, structured output, tool calling, embeddings, multimodalidade e reasoning possuem semânticas diferentes entre modelos.

O contexto AI deve possuir prompts versionados, model policy, budgets, avaliações e registros de execução. O provider adapter deve conhecer SDK, autenticação, rate limit e normalização de uso; não deve possuir regra de prompt, memória, guardrail ou negócio.

### 6.2 Controles obrigatórios na fase de IA

| Área             | Controle recomendado                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Model routing    | capability, região, política tenant, classificação de dados, custo, latência e saúde; nunca somente preço                          |
| Prompts          | immutable version, owner, changelog, eval dataset, rollout e rollback                                                              |
| Memória          | tipos explícitos, TTL, consentimento/base legal, provenance, edit/delete e limite por tenant                                       |
| RAG              | ACL antes do retrieval, metadata tenant, source citation, freshness, deletion propagation e eval de recall                         |
| Embeddings       | modelo/version, dimensão, source version e reindex plan; dados derivados sujeitos a LGPD                                           |
| Tool calling     | allowlist por agente/tenant, schema validation, autorização no momento da execução e confirmação humana para ações de alto impacto |
| Guardrails       | input/output policies, data loss prevention, content classification e limites; não depender de um único classificador              |
| Supervisor       | risco/custo configurável; não usar segundo modelo em todas as respostas sem evidência de benefício                                 |
| Human handoff    | resumo com provenance, ações, fontes e motivo; nenhuma ação irreversível escondida                                                 |
| Confiança        | não tratar probabilidade gerada pelo modelo como confiança calibrada; usar evidência, eval e regras                                |
| Alucinação       | grounding, abstention, citation verification, deterministic checks e handoff                                                       |
| Prompt injection | conteúdo recuperado sempre não confiável; separar instruções de dados; tool policies fora do prompt                                |
| Exfiltração      | egress allowlist, secrets nunca no contexto, redaction e tenant-scoped tools                                                       |
| PII              | minimização, redaction quando possível, provider data terms e retenção explícita                                                   |
| Custos           | quotas, budgets, max tokens, timeouts, per-tenant metering e anomaly alerts                                                        |
| Fallback         | somente entre capabilities compatíveis; respeitar residência/consentimento e idempotência                                          |
| Avaliações       | golden sets, safety/adversarial cases, regressão de prompts, custo e latência em CI/offline                                        |

### 6.3 Distribuição temporal das decisões

**Implementar na Fase 0:** somente primitives transversais já necessárias: correlation, métricas/custos genéricos extensíveis, secret policy e convenções para ports. Não implementar SDK, router, prompt engine, memória ou RAG.

**Documentar na Fase 0:** provider independence, capability-based ports, data classification gate, prompt/version conventions, tool authorization principle e eval requirement.

**Implementar na Fase 5:** ports concretas derivadas dos casos de uso, adapters, routing, prompt registry, execution records, budgets, guardrails, eval harness, RAG, memória e supervisor proporcional ao risco.

**Abstrações prematuras:** interface única para todos os modelos; fallback universal; ontology de agentes completa; memória de quatro níveis antes de políticas de dados; vector database abstraction sem benchmark; supervisor obrigatório em toda resposta; framework de tool plugins genérico.

---

## 7. Canais oficiais e dependências externas

| Dependência             | Riscos principais                                                                                        | Mitigação/fallback                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| WhatsApp Cloud API      | aprovação e política Meta, templates, quotas, webhook duplicado/fora de ordem, token e indisponibilidade | adapter oficial, dedupe pelo provider ID, status state machine, token rotation, buffering e modo humano/degradado |
| Instagram Messaging API | permissões/app review, account eligibility, mudanças de policy e capabilities diferentes                 | capability negotiation, contract tests, monitoring de permission errors e comunicação operacional                 |
| Provedores de IA        | lock-in semântico, data retention, região, preço, rate limit e alteração de modelo                       | ports por capability, contratos/DPA, model pinning quando possível, budgets e fallback aprovado                   |
| STT/TTS                 | idioma/qualidade, biometric/privacy concerns, duração, custo e formato                                   | adapters, consentimento/política, limites, retry seguro, texto fallback e human handoff                           |
| S3 compatível           | egress, residência, outage, URLs vazadas e diferenças de API                                             | port estreita, private-by-default, signed URL curta, lifecycle, checksum e restore test                           |
| Redis                   | eviction, failover, custo de memória, hot keys e perda                                                   | managed HA, maxmemory policy consciente, backup onde aplicável e nenhuma verdade de negócio exclusiva             |
| PostgreSQL              | connection exhaustion, IOPS, locks, vacuum, região e restore                                             | pooling, query budgets, index review, backups/PITR e restore drills                                               |
| Pagamentos              | webhooks duplicados, chargebacks, compliance, divergência financeira                                     | provider ledger, assinatura/dedupe, reconciliation e não armazenar cartão                                         |
| E-mail                  | deliverability, spam, suppression, PII e vendor outage                                                   | adapter, domain auth, suppression sync, queue e templates versionados                                             |
| Auth externo            | lock-in de identidade, outage, export, pricing e claims inconsistentes                                   | domínio Identity próprio, adapter, local session contract, export/migration plan e break-glass                    |

Requisitos comerciais são parte da arquitetura: app review e Business Verification da Meta podem bloquear Fase 4 mesmo com código pronto; contratos de dados dos provedores podem bloquear Fases 5–6; pagamentos exigem decisão de responsabilidade e reconciliação antes da Fase 9.

---

## 8. Segurança, privacidade e conformidade

### 8.1 Ativos principais

- identidades, credenciais, sessões e MFA;
- memberships, papéis e políticas;
- contatos, mensagens, anexos e áudio;
- prompts, memórias, fontes de conhecimento e embeddings;
- secrets de canais, API keys e pagamentos;
- workflows e ações automatizadas;
- audit logs, analytics e backups;
- disponibilidade das filas, webhooks e APIs.

### 8.2 Threat model resumido

| Ameaça                     | Ativo/fluxo          | Controles                                                                     | Risco residual                 |
| -------------------------- | -------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| credential stuffing        | login                | rate limit adaptativo, MFA, breach checks, alertas                            | takeover por engenharia social |
| refresh token theft/replay | sessão               | token family rotativa, hash storage, reuse detection, revogação               | endpoint comprometido          |
| IDOR/cross-tenant          | APIs e objetos       | tenant context, composite constraints, ABAC, RLS avaliada, testes negativos   | erro em caminho administrativo |
| privilege escalation       | roles/policies       | deny-by-default, change audit, separation of duties                           | policy complexity              |
| secret leakage             | integrações          | vault, envelope encryption, redaction, rotation, least privilege              | provider/log externo           |
| forged/replayed webhook    | gateway              | assinatura raw-body, timestamp/nonce quando disponível, dedupe e rate limit   | provedor sem mecanismo robusto |
| abuse/spam/DoS             | canais/API           | quotas tenant/IP/user, WAF, backpressure e circuit breaker                    | ataque distribuído/custo       |
| malicious upload           | attachment/knowledge | type sniffing, size limits, quarantine, malware scan, CDR quando necessário   | zero-day e conteúdo ativo      |
| private URL leakage        | mídia                | short-lived signed URL, authorization before signing, no public ACL           | compartilhamento pelo usuário  |
| SQL/command injection      | API/tools            | runtime validation, parameterized queries, no unsafe raw, sandbox/allowlist   | falha de dependency            |
| prompt injection           | RAG/tool calling     | untrusted context, policy outside prompt, tool authorization e egress control | ataques novos/model behavior   |
| data exfiltration by AI    | prompts/tools        | secret exclusion, DLP, tenant-scoped retrieval, confirmation                  | false negatives de DLP         |
| poisoned knowledge         | ingestion            | provenance, ACL, moderation, version/review, rollback                         | insider autorizado             |
| workflow abuse             | automação            | scoped credentials, sandbox, approvals, budgets e audit                       | lógica legítima destrutiva     |
| log/trace PII leakage      | observabilidade      | schema allowlist, redaction, sampling e restricted access                     | erro em payload excepcional    |
| backup exposure            | DR                   | encryption, isolated credentials, immutability e restore access audit         | compromise do control plane    |
| dependency/supply chain    | builds               | lockfile, provenance, SBOM, scanning, protected CI                            | malicious maintainer/update    |

### 8.3 Autenticação e sessões

Access tokens devem ser curtos e audience/scopes validados. Refresh tokens devem ser opacos ou adequadamente protegidos, armazenados por hash, rotacionados a cada uso e agrupados em famílias para detectar reuse. Revogação por sessão, logout global e eventos de segurança são obrigatórios. MFA deve usar métodos resistentes a phishing quando viável; passkeys entram na Fase 1 após escolha do adapter e recovery design.

Cookies web precisam ser `HttpOnly`, `Secure`, `SameSite` compatível com o fluxo e protegidos contra CSRF. Tokens não devem ficar em localStorage. Fluxos de convite, reset e mudança de e-mail exigem uso único, expiração e invalidation.

### 8.4 API keys e integrações

API keys usam prefixo identificável, segredo exibido uma vez, hash em repouso, scopes, tenant, expiry, last-used e rotação. Secrets externos usam references ao vault ou envelope encryption com KMS. Assinaturas de webhook devem ser verificadas sobre bytes brutos antes de parsing.

### 8.5 Privacidade e LGPD

Antes de persistir um tipo de dado, registrar finalidade, base legal, owner, classificação, localização, recipients, retenção, exclusão e legal hold. Direitos de acesso/portabilidade precisam de export consistente e auditado. Exclusão pode exigir anonimização quando obrigações impedirem purge. Backups devem ter estratégia documentada para impedir restauração permanente de dados já expirados.

### 8.6 Disaster recovery

Backups sem restore test não contam como controle. O plano precisa cobrir PostgreSQL/PITR, object storage, Redis quando necessário, secrets/config, infraestrutura e reconstrução de índices derivados. RPO/RTO variam por tier; valores iniciais estão na Seção 10 e devem ser testados, não apenas declarados.

---

## 9. Frontend e Design System

Next.js + React App Router é adequado. Server Components devem ser padrão para conteúdo server-rendered sem interatividade; Client Components apenas onde estado/browser/realtime exigirem. TanStack Query administra server state client-side; Zustand fica restrito a estado local transversal que não pertença ao servidor. Form state usa React Hook Form + validação Zod compartilhável somente no nível de schema, sem expor entidades internas.

As referências Stitch são direção visual. A auditoria encontrou HTML estático, Tailwind CDN, ausência de ARIA/form semantics, dados hardcoded, inglês predominante e duplicações exatas. Copiar esse código seria regressão de acessibilidade, segurança e manutenção.

### 9.1 Fase 0 versus Fase 2

| Fase 0                                                                             | Fase 2                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| shell Next.js compilável sem produto                                               | app shell definitivo e navegação                              |
| tokens primitivos mínimos técnicos (cores neutras, spacing base, typography hooks) | tokens primitive/semantic/component completos para light/dark |
| configuração de fonte com fallback e performance                                   | componentes acessíveis e estados/variants                     |
| locale framework preparado e `pt-BR` default                                       | catálogos i18n, formatting e estratégia de tradução           |
| baseline de accessibility lint e smoke                                             | WCAG target, keyboard, focus, screen-reader e contrast tests  |
| error boundary, not-found e health/smoke técnico                                   | loading, empty, error, success e permission states do produto |
| budgets iniciais de bundle/performance                                             | otimização por rota e métricas reais                          |
| nenhum HTML Stitch copiado                                                         | reimplementação seletiva validada visualmente                 |

Permissões na interface melhoram UX, mas backend continua fonte de verdade. Realtime deve usar eventos de UI normalizados, resume cursor, reconexão exponencial e reconciliação com API; não assumir que WebSocket entrega exatamente uma vez.

---

## 10. DevOps, operação e produção

### 10.1 Fundação recomendada

- gerenciador de pacotes com workspaces e lockfile estrito; a escolha final deve considerar suporte do stack e experiência da equipe;
- orquestrador do monorepo com task graph, cache determinístico e execução de afetados;
- Docker multi-stage, usuário não-root e imagens mínimas;
- PostgreSQL e Redis locais versionados, health-checked e sem representar HA de produção;
- ambientes local, development, staging, production e sandbox de integração, com configurações validadas;
- CI sem secrets reais para PR; integrações reais somente em ambientes autorizados;
- preview environments para Web/API quando migrations e dados isolados forem seguros;
- CD progressivo após existir ambiente, rollback e observabilidade.

Nenhum gerenciador/orquestrador precisa ser congelado pela marca antes da Fase 0; a decisão será registrada no início da fase após matriz curta de compatibilidade. Isso não altera o monorepo.

### 10.2 Health semantics

- **liveness:** processo/event loop funcional; não depende de todos os terceiros;
- **readiness:** pode receber tráfego com dependências críticas e migrations compatíveis;
- **startup:** permite inicialização longa sem restart loop;
- **deep diagnostic:** protegido, não usado pelo load balancer, com detalhes sanitizados.

### 10.3 Deploy e migrations

Rolling deployment é padrão inicial. Blue-green somente quando custo e risco justificarem. Migrations seguem expand/contract: adicionar compatível, backfill observável, migrar leitores/escritores, remover depois. Deploy não deve executar migration destrutiva automaticamente. Rollback de aplicação precisa ser compatível com schema expandido; rollback de dados usa forward fix/restore conforme runbook.

### 10.4 Objetivos iniciais mensuráveis

Estes não são promessas comerciais. São targets de engenharia para staging/primeira produção, revistos após 30 e 90 dias de tráfego real.

| Indicador                                      |        Objetivo inicial | Condição/revisão                                         |
| ---------------------------------------------- | ----------------------: | -------------------------------------------------------- |
| disponibilidade API core                       |            99,9% mensal | exclui manutenção anunciada; revisar por tier            |
| API read p95                                   |                < 300 ms | sem chamadas de IA/terceiros, payload padrão             |
| API command p95                                |                < 500 ms | aceite/persistência, processamento async fora do request |
| webhook acknowledgement p95                    |                   < 1 s | após validação mínima e persistência/dedupe              |
| mensagem até disponível para processamento p95 |                   < 5 s | provedor recebido; sem latência externa de resposta      |
| fila crítica oldest-job                        |           < 60 s normal | alertar por burn/recovery window, não média isolada      |
| realtime update p95                            |                   < 2 s | após commit/evento interno                               |
| error rate API core                            |                    < 1% | excluir 4xx esperados; segmentar por rota                |
| RPO PostgreSQL                                 |  <= 15 min inicialmente | preferir PITR menor; validar restore                     |
| RTO serviço core                               |     <= 4 h inicialmente | reduzir com maturidade e tier enterprise                 |
| restore drill                                  | trimestral inicialmente | inclui evidência e correção de runbook                   |

IA, voz e canais precisam de SLOs próprios por provedor e não devem contaminar o SLO da API core. Error budgets só serão usados para decisões de release após telemetria confiável.

### 10.5 Custos

Custos fixos iniciais: banco, Redis, compute, object storage e observabilidade. Custos variáveis dominantes: tokens/modelos, minutos STT/TTS, mídia/egress, logs e mensagens cobradas por canal. Toda fase deve estimar custo unitário e criar limites antes de habilitação ampla.

---

## 11. Revisão do roadmap

### 11.1 Regra transversal

Segurança, privacidade, performance, testes, acessibilidade, observabilidade, documentação e operabilidade são gates de todas as fases. Fase 10 valida e endurece o sistema completo; não é onde esses atributos começam.

| Fase                                  | Pré-requisitos e dependências                                  | Entregáveis/aceite                                                                                      | Riscos e paralelização                                                       | Decisões adiadas                                         |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| 0 — Fundação                          | v2.1 aprovada; Git isolado                                     | monorepo, shells, strict, CI, local infra, events primitive, observability, docs; todos os gates verdes | Web/tooling/docs paralelizáveis após decisões; evitar packages vazios        | auth adapter, providers, schema funcional, broker futuro |
| 1 — Identity/Organization             | threat model e auth build-vs-buy; data classification          | login/sessões, org/membership/team, RBAC básico, audit e tenant tests                                   | auth e tenancy são caminho crítico; UI pode acompanhar contracts             | policy engine externo, enterprise SSO/SCIM               |
| 2 — Design System                     | personas/IA, information architecture, accessibility target    | tokens completos, shell, components, light/dark, i18n, visual/a11y tests                                | pode iniciar pesquisa na Fase 1; não duplicar autorização                    | white-label completo                                     |
| 3 — Inbox                             | tenant/auth estáveis; message model e retention                | contacts operacionais, conversation/message, attachment, assignment, realtime, queues                   | data volume e consistency; Channel contract nasce com casos reais            | adapters Meta completos                                  |
| 4 — Canais Meta                       | app/business approval, test accounts, policies                 | WhatsApp/Instagram adapters, signed webhooks, dedupe, status, retries, runbooks                         | dependência comercial pode correr desde Fase 1; código depende da 3          | canais adicionais                                        |
| 5 — AI/Knowledge                      | DPIA/AI threat model, provider data terms, eval set e budgets  | provider ports/adapters, prompts, execution, RAG, tools, guardrails, supervisor proporcional            | eval/data prep paralelos; não automatizar ações críticas cedo                | multi-provider amplo, memória avançada                   |
| 6 — Voice                             | consent/retention, media pipeline e provider review            | STT/TTS, profiles, audio security, metrics/fallback                                                     | alto custo e privacidade; adapter/evals paralelos                            | telefonia/SIP                                            |
| 7 — CRM                               | contact identity contract e product rules                      | companies, opportunities, pipelines, activities, events                                                 | pode iniciar discovery após Fase 3; evitar duplicar Contact                  | CRM enterprise avançado                                  |
| 8 — Workflow                          | command contracts estáveis, sandbox threat model               | versions, nodes, execution, retries, DLQ, monitor e audit                                               | grande risco de side effects; editor e engine podem paralelizar por contract | plugin system genérico                                   |
| 9 — Analytics/Billing/Marketplace/API | event quality, entitlement model, payment/commercial decisions | OLAP/metrics, billing reconciliation, catalog/install, public API governance                            | escopo grande: deve ser dividido em 9A–9D; equipes podem paralelizar         | extensibilidade arbitrária                               |
| 10 — Production validation            | fases-alvo prontas e staging representativo                    | load/security/DR tests, cost review, SLO readiness, runbooks, release decision                          | não absorver dívida deliberadamente adiada                                   | multi-region/sharding sem demanda                        |

### 11.2 Ajustes recomendados

Manter a ordem. Dividir Fase 9 em subfases independentes evita um “mega milestone”. Iniciar instrumentação de eventos analíticos junto de cada domínio, embora dashboards/warehouse permaneçam na Fase 9. Iniciar processos comerciais Meta cedo, sem implementar adapters antes do modelo Inbox.

---

## 12. Decisões prematuras

### 12.1 Decidir agora

- monorepo e boundary enforcement;
- localização compartilhável dos Bounded Contexts;
- Modular Monolith;
- runtime e política de versões;
- TypeScript strict;
- PostgreSQL/Prisma e Redis/BullMQ para fundação;
- Event Bus port/envelope mínimo e Outbox protocol documentado;
- tenancy principles e composite invariants;
- observabilidade OpenTelemetry;
- CI gates e environment/secrets policy;
- targets operacionais provisórios;
- limites exatos da Fase 0.

### 12.2 Registrar e adiar

- RLS: decisão técnica final na Fase 1 após spike com pooling/Prisma;
- auth provider/adapter: antes da implementação da Fase 1;
- AI Provider ports concretas: Fase 5;
- Channel Provider capabilities concretas: Fases 3–4;
- pgvector versus store externo: benchmark na Fase 5;
- read replicas e particionamento: por métricas, com design readiness;
- broker dedicado: por sinais da Seção 5;
- Kubernetes: quando operação/escala justificar;
- OpenSearch: quando busca PostgreSQL não atender requisitos medidos;
- multi-region: quando residência/latência/availability exigir;
- plugin/marketplace SDK: após casos de integração controlados.

### 12.3 Não decidir ainda

| Tecnologia/padrão                    | Decisão                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| CQRS completo                        | não adotar; separar commands/queries localmente apenas quando simplificar |
| Event Sourcing                       | não adotar; audit/outbox não são event sourcing                           |
| Microsserviços                       | não adotar sem pressão medida                                             |
| Kubernetes                           | não adotar na fundação; containers não implicam Kubernetes                |
| Kafka                                | não adotar no MVP                                                         |
| OpenSearch                           | não adotar antes de requisito/benchmark                                   |
| Banco vetorial externo               | não adotar antes de corpus e SLO de retrieval                             |
| Plugin system genérico               | não desenhar antes de integrações controladas                             |
| Marketplace extensível por terceiros | não definir sandbox/SDK prematuramente                                    |
| Multi-region active-active           | não decidir sem requisitos de consistência/residência                     |
| Sharding                             | não decidir chave/topologia antes de volume real                          |
| GraphQL                              | não adicionar; REST/OpenAPI atende baseline                               |
| Service mesh                         | não adotar sem muitos serviços e necessidade operacional                  |

---

## 13. Pontos faltantes

| Item                                                      | Classificação                                    | Fase/ação                                        |
| --------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| estrutura compartilhável dos contextos entre API/Worker   | bloqueador da Fase 0                             | corrigido na v2.1                                |
| redução das abstrações prematuras da Fase 0               | bloqueador da Fase 0                             | corrigido na v2.1                                |
| matriz de classificação/retenção de dados                 | bloqueador da Fase 1 e posteriores               | template na Fase 0; preencher antes de dados     |
| decisão do auth adapter e account recovery                | bloqueador da Fase 1                             | ADR revisão antes de implementar                 |
| teste/spike de RLS com roles e pooling                    | bloqueador da conclusão da Fase 1                | incluir no plano da fase                         |
| catálogo e schema governance de integration events        | bloqueador da primeira integração cross-context  | criar com primeiro evento                        |
| app review/business verification Meta                     | bloqueador da Fase 4                             | iniciar processo comercial cedo                  |
| canonical contact identity entre Inbox/CRM                | bloqueador da Fase 7                             | contrato definido na Fase 3/7                    |
| AI DPIA/threat model/eval dataset                         | bloqueador da Fase 5                             | preparar antes de provider adapter               |
| política de consentimento/biometria de voz                | bloqueador da Fase 6                             | jurídico + produto                               |
| sandbox de JavaScript em workflows                        | bloqueador da ação de código da Fase 8           | threat model específico                          |
| entitlement versus feature flag                           | bloqueador de Billing                            | contrato explícito na Fase 9                     |
| reconciliação financeira e responsabilidades PCI          | bloqueador de Billing                            | decisão antes da integração                      |
| SLO por canais/IA/voz                                     | bloqueador de produção desses módulos            | definir com provider e testes                    |
| disaster recovery testado                                 | bloqueador de produção                           | Fase 10, ensaios anteriores                      |
| data residency e clientes regulados                       | importante, não bloqueador do MVP genérico       | discovery comercial e arquitetura celular futura |
| processo de suporte/break-glass                           | importante, não bloqueador da Fase 0             | antes de produção/admin support                  |
| política de legal hold/e-discovery                        | importante, não bloqueador inicial               | enterprise roadmap                               |
| requisitos completos do PRD e acceptance por persona      | bloqueador de cada fase funcional, não da Fase 0 | refinement contínuo                              |
| estratégia de descontinuação/versionamento de API pública | bloqueador da API pública                        | Fase 9                                           |
| accessibility conformance target formal                   | bloqueador da conclusão da Fase 2                | definir WCAG target                              |

Nenhum contexto adicional é necessário agora. “Search”, “Media” e “Integration” podem ser capacidades internas ou serviços futuros; promovê-los já a Bounded Contexts seria prematuro.

---

## 14. Notas técnicas

As notas avaliam maturidade documental atual, não potencial futuro.

| Dimensão                 | Nota | Justificativa e impedimento para 10                                                       |
| ------------------------ | ---: | ----------------------------------------------------------------------------------------- |
| Visão arquitetural       |  8,5 | coerente e proporcional; faltavam garantias operacionais concretas                        |
| Modularidade             |  7,5 | bons boundaries conceituais; localização em `apps/api` quebrava reuso API/Worker          |
| Banco de dados           |  7,0 | stack correta e convenções boas; schema, partition/retention e SQL strategy ainda futuros |
| Multi-tenancy            |  7,5 | Membership e tenant context corretos; composite constraints/RLS gate precisavam reforço   |
| Segurança                |  7,5 | princípios amplos; threat models e fluxos concretos ainda não executados                  |
| IA                       |  7,0 | provider independence e controls corretos; requirements/evals/data terms ausentes         |
| Voz                      |  6,5 | fluxo e ports claros; consentimento, formatos, biometria e SLOs não definidos             |
| Workflows                |  7,0 | versioning/retry/DLQ bons; sandbox e side-effect semantics são grandes lacunas            |
| Escalabilidade           |  7,0 | caminho progressivo sensato; sem benchmarks ou capacity model real                        |
| Performance              |  6,0 | princípios presentes; budgets, load profiles e baselines ainda não existem                |
| Observabilidade          |  8,0 | OpenTelemetry e correlação bem escolhidos; backend, sampling e custo não definidos        |
| DevOps                   |  7,0 | pipeline e ambientes claros; platform/deploy/restore reais inexistentes                   |
| Testes                   |  8,0 | estratégia e metas fortes; falta provar viabilidade e tratar flaky/performance data       |
| Frontend                 |  7,0 | stack e direção adequadas; Stitch é protótipo e DS/a11y ainda não foram construídos       |
| Roadmap                  |  8,0 | dependências majoritariamente corretas; Fase 9 grande e hardening precisava ser contínuo  |
| Documentação             |  8,5 | abrangente e rastreável; PRD e policies especializadas ainda incompletos                  |
| Custos operacionais      |  6,5 | drivers reconhecidos; falta unit economics, provider pricing e budgets reais              |
| Preparação para produção |  5,0 | arquitetura prepara o caminho, mas não há implementação, CI, SLO evidence ou DR test      |

---

## 15. Veredito e condições de congelamento

Foram encontrados bloqueadores documentais da Fase 0, mas não bloqueadores de visão ou stack. As oito correções obrigatórias são específicas, compatíveis com o produto e incorporadas na `NEXO Foundation Architecture v2.1`.

Após validar que a v2.1 contém exclusivamente essas correções, a arquitetura pode ser congelada nessa versão. Os riscos aceitos são:

- Modular Monolith pode acumular acoplamento, mitigado por packages de contexto e architecture tests;
- PostgreSQL compartilhado mantém risco de cross-tenant, mitigado por invariantes, autorização, testes e decisão de RLS;
- consistência entre contextos é eventual;
- BullMQ/Redis atende MVP, mas poderá exigir broker complementar;
- Prisma precisará de SQL controlado para recursos avançados;
- providers externos trazem custo, política e indisponibilidade não elimináveis;
- Estágios D–E exigirão revisão e evolução significativa;
- SLOs iniciais são hipóteses mensuráveis, não compromissos comerciais.

### 15.1 Architecture Freeze condicionado

- **Versão a congelar:** NEXO Foundation Architecture v2.1.
- **Data:** 15 de julho de 2026.
- **Documentos normativos:** Constitution; Security Architecture; Foundation Architecture v2.1; Master Consolidated; especificações especializadas v1.0; este Freeze Report como registro da revisão.
- **Decisões aprovadas:** stack e decisões mantidas da Seção 2, com MC-01 a MC-08 incorporadas.
- **Exceções conhecidas:** decisões explicitamente marcadas como adiadas; targets provisórios; PRD ainda refinado por fase.
- **Processo de alteração:** novo ADR ou revisão formal para mudança arquitetural; revisão de boundaries; security review para tenancy; compatibility plan para contratos públicos; nenhuma mudança silenciosa durante implementação.

## APPROVED WITH MANDATORY CORRECTIONS
