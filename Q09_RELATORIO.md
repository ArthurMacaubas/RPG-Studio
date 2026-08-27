# Q09 — Relatório de implementação: briefing e timeline públicos

**Status:** concluído e validado
**Projeto:** RPG Campaign Studio
**Escopo:** projeção server-side mínima, publicação explícita e reversível pelo OWNER, briefing curado e timeline pública com grants.

## 1. Objetivo e decisão

O Q09 fecha a lacuna auditada entre a curadoria do Modo Jogador e a comunicação de contexto para jogadores. A implementação mantém `CampaignFile` como fonte de conteúdo, `Relationship` como fonte oficial de relações e `TimelineEvent` como fonte da timeline administrativa. Não houve publicação automática de sessões, objetivos, roteiro, resumo pós-sessão, hipóteses, evidências, pins, grupos, vistas, diagnósticos ou dados administrativos de combate.

A decisão completa de modelagem, política de acesso, limites, compatibilidade e rollback está em [`Q09_MODELING_DECISION.md`](./Q09_MODELING_DECISION.md).

## 2. Entregas

| Área | Entrega |
| --- | --- |
| Persistência | `CampaignBriefing` 1:1 por campanha e `TimelineEvent.isPublished` com default privado. |
| Autorização | Leitura/escrita administrativa e publicação exigem OWNER; PLAYER e link público recebem somente projeção curada. |
| Briefing | Rota OWNER para ler, salvar rascunho, publicar e retirar publicação, com limites de título e corpo. |
| Timeline | Controles OWNER de publicar/retirar por evento; eventos existentes começam privados. |
| Projeção | DTO público separado sem IDs internos, flags administrativas, `fileId`, `campaignId` ou `order`. |
| Visibilidade | Link público só mostra arquivos publicados sem grant; jogador autenticado respeita publicação, campanha ativa e grant individual. |
| Modo Jogador | Briefing e timeline aparecem na prévia OWNER, Área do Jogador e link público quando habilitados. |
| Transferência | Exportação inclui briefing e `isPublished`; importação cria o briefing e eventos como rascunhos, exigindo nova ação explícita do Mestre. |
| Acessibilidade | Foco visível, semântica de status, controles de teclado, estados responsivos e suporte a `prefers-reduced-motion`. |

## 3. Segurança e privacidade

A consulta pública resolve o contexto no servidor e aplica o predicado central de publicação aos arquivos relacionados. Um evento sem arquivo só aparece quando o evento foi publicado. Um evento relacionado a arquivo privado, em lixeira, arquivado ou grant-only é filtrado no servidor conforme o contexto; grant-only nunca aparece no link público. O Modo Jogador desligado interrompe a projeção pública.

O DTO público do briefing contém somente `title` e `body`. O DTO público da timeline contém somente `title`, `happenedAt` e, quando aplicável, o resumo curado `file.name` e `file.type`. As telas não importam planejamento Q08, payload administrativo ou serviços de diagnóstico. A projeção mínima do resumo da campanha também remove identificadores e timestamps não necessários ao jogador.

Auditorias de salvamento e publicação registram apenas ação, campanha, ator, entidade e estado publicado; o conteúdo completo do briefing não é gravado no evento de auditoria. As rotas reutilizam os contratos públicos neutros de erro.

## 4. Compatibilidade e transferência

A timeline administrativa mantém as rotas e o formato legado para OWNER; o novo campo é aditivo. Documentos de exportação antigos sem `briefing` ou sem `timelineEvents[].isPublished` continuam válidos. O export administrativo passa a carregar o briefing e os estados de publicação. Na importação, o conteúdo é recriado sem publicação para impedir que um arquivo importado publique conteúdo por efeito colateral; a dry-run informa a necessidade de nova ação quando o documento exportado continha publicação.

A migration `20260826140000_q09_public_briefing_timeline` foi revisada e aplicada exclusivamente ao PostgreSQL Neon de teste isolado autorizado. Não foram usados reset, DROP, seed amplo, limpeza global ou alteração de campanhas existentes.

## 5. Validação

| Gate | Resultado |
| --- | --- |
| `prisma generate` | PASS |
| `prisma format --check` | PASS |
| `prisma validate` | PASS |
| `tsc --noEmit -p .` | PASS |
| `pnpm lint` | PASS |
| Vitest completo | PASS — 44 arquivos, 267 testes |
| `pnpm build` | PASS — compilação e páginas estáticas concluídas |
| `pnpm run db:smoke` | PASS |
| Constraint PostgreSQL | PASS |
| Integridade/rollback PostgreSQL | PASS |
| Round-trip PostgreSQL existente | PASS |
| Integração PostgreSQL específica Q09 | PASS — projeção pública, grants, modo desligado, ordenação, isolamento cross-campaign, round-trip e limpeza guardada |

A integração Q09 criou somente fixtures com prefixo temporário próprio, verificou link público e jogador autenticado, confirmou a filtragem de público/grant/privado/arquivado/rascunho e removeu as fixtures em `finally`. Nenhuma fixture permaneceu no banco de teste.

## 6. Backlog após Q09

O próximo trabalho não foi iniciado automaticamente neste checkpoint. O backlog continua priorizado por impacto e risco: ergonomia e diagnósticos acionáveis do Quadro de Investigação; recuperação operacional de sessões; regras determinísticas do Compilador; busca e navegação do Mestre; colaboração e auditoria; e, por último, rate limiting distribuído/object storage, que continuam bloqueados por ausência de provider, segredo e ambiente aprovados.

## 7. Condição de publicação

O código está pronto para ser versionado e publicado após a revisão final de diff e scanner de segredos. A variável de banco permanece somente no ambiente secreto autorizado da Vercel e nos arquivos locais ignorados; não foi incluída em código, relatório, artefato ou commit.
