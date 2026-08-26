# Q08 — Planejamento operacional de sessões

**Status: APROVADO**

## Síntese

O Q08 transformou o modelo relacional administrativo `Session` em uma ferramenta privada de preparação e acompanhamento para o Mestre. O fluxo permite criar, editar, concluir e remover planejamentos com objetivos, roteiro, checklist estruturado, resumo da sessão, resumo pós-sessão e vínculos campaign-scoped a fichas, hipóteses e vistas salvas.

A implementação preserva a decisão de modelagem registrada em [`Q08_MODELING_DECISION.md`](Q08_MODELING_DECISION.md): `CampaignFile(type = SESSION)` continua sendo o conteúdo canônico usado pela página de Sessões, pela Sala de Sessão e pela publicação, enquanto o modelo Prisma `Session` é a entidade relacional administrativa usada pelo combate, dashboard, transferência e planejamento. Não houve conversão automática de arquivos legados, duplicação de conteúdo canônico ou publicação de rascunhos.

## Escopo entregue

| Área | Resultado verificado |
|---|---|
| Planejamento | `Session` recebeu objetivos, agenda/roteiro, resumo pós-sessão, status `PLANNED`/`COMPLETED` e `completedAt`; checklist legado foi preservado e passou a ser normalizado no serviço Q08. |
| Vínculos | `SessionFile` foi reutilizado para fichas; `SessionHypothesis` e `SessionBoardView` foram criados para hipóteses e vistas administrativas, com unicidade por sessão/recurso e escopo de campanha. |
| Segurança | Leitura e escrita exigem OWNER; sessão e recursos vinculados são validados pela mesma campanha antes da operação; PLAYER, P1–P4 e link público não recebem planejamento privado. |
| Navegação | Os atalhos de abrir/restaurar vista e destacar hipótese usam somente estado local já existente no Quadro; não criam relações, nós, evidências, pins ou arestas e não alteram conteúdo canônico. |
| Transferência | Exportação, validação, dry-run e importação incluem os campos Q08 e remapeiam sessão, arquivos, hipóteses e vistas na ordem correta, dentro da transação. Documentos legados recebem defaults seguros. |
| Interface | O painel administrativo foi integrado à página de Sessões sem substituir o explorador de `CampaignFile SESSION`, com estados vazios, feedbacks, controles de teclado, foco visível, responsividade e `prefers-reduced-motion` escopado. |

## Schema e migration

A migration aditiva [`20260825130000_q08_session_planning`](prisma/migrations/20260825130000_q08_session_planning/migration.sql) contém apenas o enum, as colunas administrativas de `Session`, as tabelas de junção Q08, índices e chaves estrangeiras correspondentes. A alteração foi revisada antes da aplicação e aplicada exclusivamente no PostgreSQL isolado de teste autorizado. Não foram usados `migrate reset`, `DROP`, seed amplo, limpeza global ou reparo manual.

O serviço não adicionou timestamps inexistentes ao modelo `Session`; a serialização segue o schema real e mantém ordenação estável por identificador quando necessário. A migration não altera `CampaignFile SESSION`, o checklist legado, a política de publicação ou os modelos canônicos de `Relationship` e `BoardEdge`.

## Serviço e API

O serviço [`sessionPlanningService.ts`](src/services/sessionPlanningService.ts) centraliza a autorização OWNER, limites de payload, normalização de objetivos, roteiro e checklist, transição de conclusão, remoção e sincronização transacional dos vínculos. Referências ausentes, duplicadas ou pertencentes a outra campanha são rejeitadas com erro seguro. A substituição de vínculos não apaga a ficha, hipótese ou vista referenciada.

As rotas administrativas são `GET/POST /api/campaigns/[id]/session-plans` e `GET/PATCH/DELETE /api/session-plans/[id]`. Consultas por identificador fazem a resolução do proprietário antes de expor dados, e as respostas usam a política pública de erros existente, sem ecoar detalhes internos, IDs ou mensagens de banco.

## Transferência administrativa

A exportação inclui os campos estruturados, status, conclusão e IDs de origem dos vínculos administrativos. A validação limita objetivos e roteiro a 20 itens, checklist a 80 itens, rótulos a 240 caracteres e resumo pós-sessão a 20.000 caracteres, além de rejeitar referências inválidas e duplicidades.

No import, sessões são criadas antes dos joins dependentes; os mapas de identidade de sessões, hipóteses e vistas são mantidos até que todos os recursos tenham sido remapeados. Os vínculos `SessionHypothesis` e `SessionBoardView` são então criados na mesma transação. Documentos anteriores ao Q08 continuam válidos com objetivos/roteiro/checklist normalizados, status `PLANNED`, ausência de `completedAt` e listas de vínculos vazias.

## Testes e integração PostgreSQL

A suíte final passou com **42 arquivos de teste e 258 testes aprovados**. A cobertura inclui serviço Q08, fronteira HTTP, guards OWNER, normalização, limites, conclusão, referências cross-campaign, duplicidade, remoção, substituição transacional de vínculos, exportação, importação, dry-run, remapeamento, rollback e compatibilidade legada.

O script [`scripts/session-planning-q08-db.ts`](scripts/session-planning-q08-db.ts) foi executado somente com `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1`. O resultado agregado confirmou `guards`, persistência, exportação de planejamento, remapeamento, rollback, isolamento cross-campaign e isolamento de jogador. O erro de unicidade exibido durante a execução foi a colisão de tags criada deliberadamente para provocar rollback; a transação foi rejeitada e limpa, e o script terminou com `ok: true`.

O teste de banco criou apenas fixtures temporárias, validou o round-trip e removeu as campanhas temporárias no bloco de limpeza. Nenhuma URL, host, token, credencial, identificador de campanha ou dado privado foi incluído no relatório, na evidência ou no código de configuração.

## Validação técnica final

| Gate | Resultado |
|---|---|
| `pnpm exec prisma format --check` | Aprovado; schema formatado. |
| `pnpm exec prisma validate` | Aprovado; schema válido. |
| `pnpm exec prisma generate` | Aprovado; Prisma Client regenerado. |
| `pnpm exec tsc --noEmit -p .` | Aprovado; TypeScript strict sem erros. |
| `pnpm lint` | Aprovado; nenhum warning ou erro ESLint. |
| `pnpm exec vitest run --pool=forks --maxWorkers=1 --reporter=dot` | Aprovado; 42 arquivos e 258 testes. |
| `pnpm build` | Aprovado; build de produção e rotas Q08 compilados. |
| Script PostgreSQL Q08 com os dois guards | Aprovado; persistência, remapeamento, rollback e isolamento confirmados. |
| Varredura de segurança Q08 | Aprovada; nenhum segredo, host, URL de banco ou ID de campanha em escopo documental/implementação. |

A opção `--minWorkers` foi descartada na execução final porque a versão efetivamente instalada do Vitest não a reconhece. A suíte foi executada com pool de forks e um worker, encerrou corretamente e produziu o status final confiável acima.

## Validação browser autenticada

A evidência anonimizada está em [`Q08_BROWSER_FINDINGS.md`](Q08_BROWSER_FINDINGS.md). O fluxo OWNER criou uma sessão temporária, editou os campos estruturados, vinculou ficha/hipótese/vista, salvou, concluiu e confirmou o status privado. O atalho local abriu o Quadro com a vista ativa e a hipótese selecionada sem mutação canônica.

A limpeza foi feita pela UI: o planejamento temporário foi removido sem alterar `CampaignFile SESSION`, a hipótese foi removida no Quadro e a vista foi removida no painel de vistas salvas. A confirmação final mostrou nenhuma hipótese aberta e contador zero de vistas salvas. O explorador legado permaneceu separado durante todo o fluxo.

A separação de jogador foi confirmada também por auditoria estática: as superfícies sob `jogador`, `player`, `public` e `modo-jogador` não importam `SessionPlanningPanel`, `sessionPlansApi`, as rotas `session-plans` ou os tipos privados Q08. O script de banco confirmou adicionalmente `playerIsolation: true`.

## Rollback, riscos e não-escopo

O rollback funcional do import é transacional: qualquer colisão ou referência inválida rejeita a operação e impede campanha, sessão ou vínculo parcial. O rollback do schema é aditivo e deve ser tratado como migration reversa somente em procedimento futuro controlado; esta entrega não executa remoção de schema.

O principal risco residual é a coexistência intencional de `CampaignFile SESSION` e `Session Prisma`. A decisão foi mantida explícita, os fluxos legados foram preservados e nenhuma conversão automática foi introduzida. Planejamento publicado, briefing/timeline para jogadores, rate limiting, object storage, backup, IA e qualquer mudança de política pública permanecem fora do escopo.

## Decisão do gate

Todos os gates de schema, serviço, API, transferência, UI, testes, integração PostgreSQL, build, segurança e browser foram aprovados. Portanto, **Q08 está APROVADO**. O próximo quadrante permitido é Q09; ele não foi iniciado nesta execução.

## Referências internas

[1]: Q08_PLANEJAMENTO_SESSOES_PROMPT.md "Prompt de transição Q08"
[2]: Q08_MODELING_DECISION.md "Decisão de modelagem Q08"
[3]: Q08_BROWSER_FINDINGS.md "Evidência browser Q08 anonimizada"
[4]: prisma/migrations/20260825130000_q08_session_planning/migration.sql "Migration aditiva Q08"
[5]: scripts/session-planning-q08-db.ts "Integração PostgreSQL Q08"
[6]: src/services/sessionPlanningService.ts "Serviço de planejamento Q08"
[7]: src/services/campaignTransferService.ts "Transferência administrativa"
