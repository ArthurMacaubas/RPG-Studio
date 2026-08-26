# V20 — Hardening da Fronteira de Publicação

## Resultado

A V20 centraliza a política de publicação no servidor e remove as regras duplicadas que permitiam exposição indireta de conteúdo de campanha. A implementação preserva a arquitetura existente, o banco, o Core oficial de `Relationship`/`RelationshipType` e a separação entre relações e `BoardNode`/`BoardEdge`.

Não houve migration, alteração de schema, reset, exclusão de dados ou funcionalidade de V21.

## Política central

O novo módulo `src/lib/publicationPolicy.ts` define `ViewerContext` para Mestre, jogador autenticado P1–P4 e link público. Ele concentra `publishedFileWhere()`, `getViewerContext()`, `getPublicViewerContext()`, `assertViewerCanReadFile()`, `searchableFileWhere()` e projeções seguras de arquivo/campanha.

| Contexto | Regra aplicada |
|---|---|
| OWNER | Mantém acesso integral de campanha, inclusive aos fluxos administrativos. |
| PLAYER P1–P4 | Exige campanha correta, Modo Jogador habilitado no fluxo aplicável, arquivo ativo, não arquivado, fora da lixeira, publicado e grant `canView` quando `restrictToGrants=true`. |
| Link público | Exige Modo Jogador habilitado, arquivo ativo/publicado e `restrictToGrants=false`. |

As projeções publicadas não incluem comentários, histórico, relações completas, autor, grants ou objetos Prisma amplos. Tags e anexos só são expostos quando pertencem a um arquivo já autorizado pela política.

## Correções por superfície

| Superfície | Correção V20 |
|---|---|
| Arquivos | `list`, `countsByType` e `get` passam a usar a política central. Leitura direta de jogador retorna somente arquivo publicado e projeção segura. |
| Comentários | `fileService.addComment()` e sua rota agora exigem contexto autenticado, campanha, arquivo publicado e autor real. A rota passa por `apiErrorResponse`. |
| Anexos | Continuam sob guard de escrita; a leitura só acontece na projeção de arquivo autorizado. |
| Quadro | Nós são filtrados pela política central antes de carregar arquivo, tags e anexos; arestas dependem apenas dos nós restantes. |
| Busca | Corrigida a composição `OR` que podia sobrescrever a visibilidade. Busca de jogador agora exige Modo Jogador, publicação, atividade e grant. |
| Dashboard | Tornado estritamente administrativo; jogador é redirecionado antes da consulta e a chamada direta recebe `404`. |
| Campanha e favoritos | Jogador não recebe entradas de favoritos nem arquivos aninhados privados. A listagem de favoritos retorna coleção vazia para jogador. |
| Tags | Jogador recebe somente tags que pertencem a arquivos visíveis pela política. |
| Relacionamentos | A política V17 de audiência e duas pontas foi preservada e agora exige o contexto V20; links públicos verificam Modo Jogador antes de listar relações `ALL`. |
| Modo Jogador | Leitura autenticada, link público e prévia de membro compartilham a mesma projeção. A curadoria exibe estados Público, Grant, Privado, Arquivado e Indisponível; ações mostram sucesso, falha e rollback. |

## Arquivos principais alterados

| Arquivo | Alteração |
|---|---|
| `src/lib/publicationPolicy.ts` | Nova política, ViewerContext, predicados e projeções seguras. |
| `src/services/fileService.ts` | Leitura publicada e comentários autenticados/autorizados. |
| `src/services/playerModeService.ts` | Projeção unificada, preview real e estados de curadoria. |
| `src/services/boardService.ts` | Quadro filtrado por arquivo publicado. |
| `src/services/searchService.ts` | Busca segura com `AND` da fronteira central. |
| `src/services/relationshipService.ts` | Composição V17 + V20 para jogador e link público. |
| `src/services/campaignDashboardService.ts` | Dashboard owner-only. |
| `src/services/campaignService.ts`, `favoriteFolderService.ts`, `tagService.ts` | Projeções e listagens sem favoritos/tags privados de jogador. |
| `src/app/api/files/[id]/comments/route.ts` | Tratamento seguro de comentário por API. |
| `src/app/campaigns/[id]/modo-jogador/*` | Estados de publicação e feedbacks V20. |

## Testes executados

| Verificação | Resultado |
|---|---|
| `npm install` | Concluído, sem alteração de dependência. |
| `prisma format` | Concluído. |
| `prisma validate` | Schema validado com URL sintática temporária, sem conexão de banco. |
| TypeScript | `npx tsc --noEmit -p .` aprovado. |
| Lint | `npx next lint --dir src` aprovado sem warnings. |
| Testes | **12 arquivos e 74 testes aprovados**. |
| Build | `npm run build` aprovado. |

A cobertura V20 inclui OWNER, P1, P2, P3, P4, link público, ausência de sessão, arquivo público/privado/com grant/sem grant/arquivado/na lixeira, Modo Jogador pausado/ativo, leitura direta, comentário, busca, dashboard, quadro e relacionamentos. A cobertura prévia de V17 continua validando audiências e duas pontas de relacionamento.

## Teste PostgreSQL não executado

[URL/credencial de banco redigida neste histórico]

Quando houver uma URL PostgreSQL válida de banco de teste, o comando deve ser executado novamente. O script cria apenas dados temporários e os remove ao terminar.

## Riscos e pendências

O risco residual principal é operacional: a URL de banco do ambiente precisa ser corrigida para permitir migration status e integração real. O `npm install` continua apontando 6 vulnerabilidades de alta severidade pré-existentes; nenhum `npm audit fix` foi executado para evitar atualização não revisada fora do escopo.

## Status

**V20 PRONTA**

Aguardo a próxima instrução antes de iniciar qualquer versão nova.
