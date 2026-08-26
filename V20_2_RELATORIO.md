# V20.2 — Relatório Técnico de Fechamento

**Projeto:** RPG Campaign Studio  
**Escopo:** fechamento de superfícies administrativas em health, simulador, timeline e relacionamentos, sem iniciar V21.  
**Data:** 22 de agosto de 2026

## Diagnóstico e decisão arquitetural

A auditoria da V20.2 confirmou que o compilador de campanha (`health` e `simulate`) manipula diagnósticos que contêm nomes, IDs, caminhos de grafo e referências administrativas. A timeline administrativa também podia expor arquivos vinculados por meio de um retorno Prisma mais amplo. Essas superfícies não são equivalentes ao Modo Jogador e não poderiam depender de ocultação na interface.

A decisão aplicada foi **OWNER-only** para health, simulate e todas as operações administrativas da timeline. O bloqueio está no serviço, antes das consultas de dados sensíveis, e as rotas transformam falhas de autorização em respostas HTTP controladas. Uma futura timeline pública deverá ser uma superfície separada, deliberadamente projetada sobre `publicationPolicy.ts`; ela não deve reutilizar a timeline administrativa.

Os relacionamentos mantêm o modelo central já existente: `ViewerContext`, `publishedFileWhere`, Modo Jogador e audiência V17. Não foi criada uma segunda política de publicação nem um sistema paralelo de relações.

## Alterações implementadas

| Área | Alteração | Efeito de segurança |
|---|---|---|
| `campaignHealthService` | `computeCampaignHealth` exige `assertCampaignRole(campaignId, 'OWNER')` antes de qualquer leitura. | PLAYER, público e requisições sem sessão não recebem diagnóstico, nomes, caminhos ou referências do compilador. |
| Rotas `health` e `health/simulate` | Mantêm o mapeamento central de erro para chamadas diretas. | O servidor, e não a interface, decide o acesso. |
| `timelineService` | `list`, `create`, `update` e `remove` exigem OWNER; leituras e escritas usam `timelineEventSelect` explícito. | O arquivo vinculado limita-se a `id`, `name`, `type`, `isArchived` e `isTrashed`; `data` não sai pela timeline. |
| Rotas de timeline | `GET`, `POST`, `PATCH` e `DELETE` agora encaminham falhas por `apiErrorResponse`. | Respostas diretas preservam status controlados em vez de exceções sem tratamento. |
| `relationshipService` | Leituras `get`, `getForEntity`, `getGraph`, `listForPlayer` e `listForPublic` usam o contexto e os filtros da política V20. | Relações só aparecem quando ambas as pontas são publicadas, acessíveis e compatíveis com audiência; Modo Jogador bloqueia fluxos de jogador quando desligado. |
| Rota de relações | A consulta de `fileId` é validada com Zod antes de atingir o serviço. | Evita delegar entradas ausentes ou inválidas ao fluxo protegido. |

## Matriz de segurança coberta

| Superfície | OWNER | P1–P4 | Sem sessão | Público | Modo Jogador desligado |
|---|---:|---:|---:|---:|---:|
| `GET /health` | 200 com diagnóstico administrativo | 403 | 401 | Não há rota pública | Não aplicável ao OWNER; não libera PLAYER |
| `POST /health/simulate` | 200 com simulação administrativa | 403 | 401 | Não há rota pública | Não aplicável ao OWNER; não libera PLAYER |
| `GET /campaigns/:id/timeline` | 200 com projeção limitada | 403 | 401 | Não há rota pública | Não libera PLAYER |
| `PATCH`/`DELETE /timeline/:id` | Permitido ao OWNER autorizado | 403 | Mapeado pelo serviço | Não há rota pública | Não libera PLAYER |
| Relações de jogador e públicas | OWNER preserva acesso administrativo | Só com publicação, audiência e acessibilidade nas duas pontas | Sem contexto autenticado quando exigido | Apenas conteúdo público elegível | Bloqueadas para PLAYER |

As respostas negadas de health, simulate, timeline e mutações da timeline são testadas sem ecoar mensagens com conteúdo privado. A resposta permitida de timeline é verificada para não conter `file.data`. As regressões de relacionamentos cobrem os cenários já existentes de OWNER, link público, P1–P4, visibilidade, arquivamento, lixeira e Modo Jogador desligado.

## Testes adicionados ou reforçados

| Arquivo | Cobertura |
|---|---|
| `src/services/administrativeAccess.test.ts` | P1–P4 bloqueados no compilador e na timeline antes de consultas Prisma; OWNER usa a projeção explícita. |
| `src/app/api/administrative-boundary.test.ts` | Chamadas diretas a health, simulate, timeline GET, PATCH e DELETE para OWNER, P1–P4 e sem sessão; ausência de conteúdo privado nas respostas. |
| `src/services/relationshipService.test.ts` | Matriz já ampliada na V20.2 para Modo Jogador desligado e acesso de relações composto pela política V20. |

## Validação executada

| Verificação | Resultado |
|---|---|
| `npx prisma format --check` | Aprovado. |
| `npx prisma validate` | Aprovado. A validação local usou URL PostgreSQL sintática temporária e não estabeleceu conexão. |
| `npx tsc --noEmit -p .` | Aprovado. |
| `npm run lint -- --dir src` | Aprovado, sem warnings ou erros. |
| `npm test -- --run` | Aprovado: **14 arquivos, 124 testes**. |
| `npm run build` | Aprovado, incluindo compilação das rotas administrativas. |
[URL/credencial de banco redigida neste histórico]

Nenhuma migration foi criada, aplicada ou alterada. Nenhum reset, `DROP`, `prisma migrate reset` ou escrita no banco foi executado durante a V20.2.

## Riscos e pendências conhecidas

O teste real de constraints e transação PostgreSQL continua pendente exclusivamente porque a configuração `DATABASE_URL` deste ambiente é inválida para Prisma. Assim que uma URL de **banco de testes isolado** estiver disponível, a execução recomendada é `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 npm run test:db:integrity`. Esse script cria dados temporários, verifica constraints e rollback e tenta removê-los ao final; ele não deve ser apontado a uma base de produção.

O produto ainda não possui uma timeline pública. Isso é intencional: expor a timeline administrativa ao PLAYER ou ao link público seria uma regressão de segurança. Caso essa necessidade entre em escopo, deverá ser implementada como recurso novo, com contrato e projeção próprios, reutilizando `publicationPolicy.ts`.

## Conclusão

A V20.2 fecha as superfícies administrativas identificadas sem redesenhar o editor, sem duplicar regras de publicação, sem migration e sem iniciar uma nova versão. A fronteira efetiva está no backend: o OWNER conserva compilador, simulador, timeline e relações administrativas; PLAYER e público não recebem dados administrativos por chamadas diretas.
