# Baseline da evolução autônoma

**Projeto:** RPG Campaign Studio
**Data da auditoria inicial:** 26/08/2026
**Incremento concluído neste ciclo:** Q09 — briefing e timeline publicados para jogadores.
**Estado do banco:** PostgreSQL Neon de teste isolado e autorizado; nenhuma credencial ou dado privado é documentado neste arquivo.

## 1. Gates do estado de partida

O estado de partida foi auditado antes da alteração, a partir do código real, README, schema Prisma, migrations recentes, rotas, serviços, testes e relatórios. Os gates locais não destrutivos do baseline passaram:

| Gate | Resultado no baseline |
| --- | --- |
| `pnpm exec prisma generate` | PASS |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| lint | PASS |
| Vitest | PASS — 42 arquivos, 258 testes |
| build | PASS |

O baseline não executou migration, reset, seed, limpeza ou alteração de dados.

## 2. Mapa de módulos e superfícies de acesso

A aplicação usa Next.js App Router, TypeScript, Prisma e PostgreSQL. A camada HTTP fica em `src/app/api`; as regras de domínio ficam em `src/services`; `src/lib/access.ts` centraliza acesso por campanha e papel; `src/lib/publicationPolicy.ts` define contextos OWNER, PLAYER e PUBLIC; os contratos compartilhados ficam em `src/types`; a UI usa React e CSS Modules.

As superfícies administrativas incluem campanhas, arquivos polimórficos, relacionamentos oficiais, quadro de investigação, hipóteses/evidências, pins/grupos/vistas, planejamento de sessões, combate, compilador, auditoria, convites, importação/exportação, timeline e curadoria do Modo Jogador. As superfícies de jogador incluem a Área do Jogador autenticada, o link público e as APIs correspondentes.

## 3. Estado funcional após Q09

| Área | Estado real | Observação |
| --- | --- | --- |
| Autenticação própria | Concluída e validada | Cadastro, login, sessões persistidas e cookie HTTP-only operacionais em produção após configuração do banco autorizado. |
| Arquivos e relações | Concluída | `CampaignFile` é a fonte de conteúdo e `Relationship` é a fonte oficial de relações. |
| Quadro investigativo | Concluída | BoardEdge, hipóteses/evidências, pins, grupos e vistas permanecem administrativos. |
| Planejamento Q08 | Concluído | `Session` relacional permanece separado de `CampaignFile(type=SESSION)` e não é publicado automaticamente. |
| Modo Jogador | Concluído no escopo existente | Publicação por arquivo, grants, link público, prévia por membro e filtro server-side existem. |
| Q09 briefing | Concluído | Entidade 1:1, rascunho, publicação/retirada OWNER e projeção pública mínima. |
| Q09 timeline pública | Concluído | `TimelineEvent.isPublished`, filtro por arquivo/contexto, limite e DTO sem IDs internos. |
| Transferência Q09 | Concluída | Export inclui briefing/publicação; import cria tudo como rascunho e mantém compatibilidade legado. |
| Rate limiting distribuído | Bloqueado | Não há provider, segredo ou ambiente de teste aprovado. |
| Object storage | Bloqueado | Não há provider, segredo ou ambiente aprovado. |

## 4. Migrations

No ponto de partida, a última migration aplicada era a de planejamento Q08. Neste ciclo foi criada, revisada e aplicada exclusivamente no PostgreSQL Neon de teste a migration aditiva `20260826140000_q09_public_briefing_timeline`, que cria `CampaignBriefing`, adiciona `TimelineEvent.isPublished` com default `false` e cria índices mínimos. Não foi usado reset, DROP, seed amplo, limpeza global ou saneamento automático.

A Vercel continua apontando para o banco de teste explicitamente autorizado; não foi configurado um banco de produção compartilhado nem foi executada migration em um ambiente diferente do Neon de teste autorizado.

## 5. Riscos e controles

O risco prioritário auditado era a ausência de projeção pública específica para briefing e timeline, com possibilidade de reutilização indevida de dados administrativos. O controle implementado separa `campaignBriefingService.getPublicSnapshot` do payload administrativo, aplica `publishedFileWhere` no servidor, exige Modo Jogador ativo e retorna somente campos curados.

O risco de autorização foi coberto mantendo timeline e briefing administrativos OWNER-only, bloqueando publicação por PLAYER/P1–P4 e evitando decisões de visibilidade baseadas em query string ou IDs enviados pelo cliente. O risco de compatibilidade foi tratado com campos opcionais no documento de transferência e com eventos legados privados por default.

## 6. Backlog priorizado

| Prioridade | Incremento | Impacto | Risco | Dependências | Esforço | Estado |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Q09: briefing, timeline e projeção pública curada | 5 | 4 | 3 | 4 | CONCLUÍDO |
| 2 | Hardening OWNER/PLAYER/P1–P4/PUBLIC | 5 | 5 | 3 | 3 | CONCLUÍDO no escopo Q09 |
| 3 | Ergonomia do quadro investigativo e diagnóstico acionável | 4 | 3 | 2 | 4 | Próximo candidato |
| 4 | Preparação e recuperação operacional de sessões | 4 | 3 | 2 | 4 | Posterior |
| 5 | Compilador com regras e links de correção | 4 | 3 | 2 | 4 | Posterior |
| 6 | Busca, navegação e produtividade do Mestre | 4 | 2 | 2 | 3 | Posterior |
| 7 | Colaboração e auditoria operacional | 4 | 4 | 3 | 4 | Posterior |
| 8 | Rate limiting distribuído e object storage | 3 | 5 | 5 | 5 | BLOQUEADO por infraestrutura ausente |

O próximo candidato só deve começar após checkpoint deste Q09 e nova auditoria real da área correspondente. Nenhuma nova frente foi implementada sem provider ou decisão de operação aprovados.

## 7. Checkpoint do incremento

O relatório completo do Q09 está em [`Q09_RELATORIO.md`](./Q09_RELATORIO.md), e a decisão de modelagem está em [`Q09_MODELING_DECISION.md`](./Q09_MODELING_DECISION.md). O código inclui testes unitários, testes de rota, integração PostgreSQL específica com fixtures temporárias e round-trip de transferência. O checkpoint está pronto para revisão de diff, scanner de segredos e publicação solicitada pelo usuário.
