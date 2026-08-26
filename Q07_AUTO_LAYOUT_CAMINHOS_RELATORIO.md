# Q07 — Auto-layout opcional e caminhos de pistas

**Status: APROVADO**  
**Data da validação:** 25/08/2026  
**Projeto:** RPG Campaign Studio

## Resultado

Q07 foi concluído e aprovado. O Quadro administrativo agora oferece auto-layout opcional com prévia local, cancelamento e confirmação explícita, além de caminhos locais entre duas fichas. O recurso preserva a separação entre `CampaignFile`, `BoardNode`, `Relationship`, `BoardEdge` e hipóteses/evidências. Nenhum registro canônico é criado, inferido ou alterado durante o cálculo de layout ou caminhos.

Não foi necessária migration, alteração de schema, nova dependência ou alteração de lockfile. A persistência explícita usa apenas os `BoardNode` existentes e uma transação PostgreSQL campaign-scoped.

## Decisões e implementação

| Área | Implementação aprovada |
| --- | --- |
| Auto-layout | Módulo puro `investigationBoardLayout.ts`, determinístico, limitado a 120 nós, com camadas por relações oficiais e grade estável. Nós em ciclos são colocados na camada final; relações não direcionais recebem uma orientação estável somente para o cálculo visual. |
| Preview | `layoutPreview` mantém posições originais e propostas no estado local. Durante a prévia, conexão, adição e remoção de nós ficam desabilitadas. |
| Cancelamento | Restaura imediatamente as posições originais locais e não chama API de escrita. |
| Confirmação | `PUT /api/campaigns/[id]/board/positions` valida OWNER, campanha, duplicidade, limites e nós existentes; atualiza todos os nós em uma transação. |
| Caminhos oficiais | BFS simples e determinístico usando exclusivamente o grafo autorizado de `Relationship`; respeita direção e permite os dois sentidos quando o tipo é não direcional. `BoardEdge` não participa. |
| Caminhos evidenciais | Usa somente a hipótese selecionada e pares consecutivos das evidências válidas em sua ordem. Cada segmento é marcado `HYPOTHESIS_EVIDENCE` e exibido como “Evidência da hipótese — não é relação oficial”. |
| Caminhos combinados | Une as duas fontes somente na visualização e mantém a origem de cada segmento. O Mestre pode selecionar explicitamente a alternativa quando há múltiplos caminhos. |
| Limites | Profundidade máxima de 12 segmentos e 12 caminhos; endpoints ausentes, ciclo, ausência de caminho e truncamento têm mensagens explicativas. |
| Isolamento | O painel foi integrado apenas a `InvestigationBoardEditor`; `PlayerInvestigationBoard` não importa o painel, módulos ou contrato administrativo Q07. |
| Acessibilidade | Painel com foco visível, `aria-label`, `aria-pressed`, seleção por teclado, fechamento por Escape e respeito a `prefers-reduced-motion`; nenhuma animação contínua foi introduzida. |

## Arquivos principais

Foram adicionados `src/services/investigationBoardLayout.ts`, `src/services/investigationBoardPaths.ts`, `src/app/api/campaigns/[id]/board/positions/route.ts`, `src/app/campaigns/[id]/investigacao/BoardLayoutPathsPanel.tsx`, `src/services/investigationBoardLayoutPaths.test.ts`, `src/services/boardServiceUpdatePositions.test.ts`, `src/app/campaigns/[id]/investigacao/InvestigationBoardQ07.test.ts` e `scripts/board-layout-q07-db.ts`.

Foram alterados `src/services/boardService.ts`, `src/lib/api.ts`, `src/app/campaigns/[id]/investigacao/InvestigationBoardEditor.tsx` e `src/app/campaigns/[id]/investigacao/page.module.css`. Também foram criados `Q07_MODELING_DECISION.md`, `Q07_BROWSER_FINDINGS.md` e a evidência visual anonimizada em `evidence/q07/q07-layout-caminhos-anonimizado.webp`.

## Validação

| Gate | Resultado |
| --- | --- |
| `pnpm exec prisma generate` | PASS — nenhuma migration nova em Q07 |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| `pnpm exec next lint --dir src` | PASS |
| `pnpm exec vitest run --run` | PASS — 39 suítes, 241 testes |
| `pnpm run build` | PASS — compilação e 24 páginas estáticas concluídas |
| Teste focado Q07 | PASS — 3 suítes, 20 testes |
| `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm exec tsx scripts/board-layout-q07-db.ts` | PASS — rollback transacional observado, fixture temporária campaign-scoped removida |
| Navegador autenticado administrativo | PASS — painel, prévia, cancelamento, caminho oficial e seleção explícita verificados |

A integração PostgreSQL de Q07 utilizou somente os guards de teste confirmados. A transação moveu uma posição temporariamente, verificou a alteração dentro da transação, forçou rollback controlado e confirmou que a posição original permaneceu após o rollback. A saída registrada foi sanitizada e não contém URL, host, token, IDs ou dados de campanha.

A validação visual confirmou que **Pré-visualizar layout** mostra posições locais sem persistência, **Cancelar prévia** restaura o estado anterior e a busca oficial exibe um caminho de dois saltos com segmentos identificados. A captura arquivada mantém apenas a estrutura do painel e a legenda, com nomes e identificadores mascarados.

## Segurança e integridade

O endpoint de posições exige escrita OWNER e recebe `campaignId` pela rota. O serviço revalida a autorização antes de consultar nós, rejeita IDs duplicados, rejeita posições fora do limite e rejeita qualquer conjunto que não corresponda integralmente a nós da campanha. A transação impede atualização parcial do lote.

O grafo de relações é recebido do endpoint administrativo existente, que mantém a política de publicação no servidor. O cliente não reconstrói visibilidade, não consulta relações de outra campanha e não converte evidência em `Relationship`. O modo jogador e o público não recebem preview, caminhos internos, hipóteses, evidências ou posições administrativas propostas.

## Rollback e limitações

Como não houve migration, o rollback de dados é simplesmente não aplicar o endpoint e remover as alterações de UI/serviço; nenhuma etapa de schema precisa ser revertida. A transação do endpoint não deixa escrita parcial em caso de falha. A rotina de drag manual existente continua usando seu fluxo anterior; Q07 acrescenta confirmação transacional especificamente para o auto-layout.

O auto-layout é uma sugestão visual e não busca otimização semântica. O caminho evidencial usa a ordem explícita das evidências como sequência de visualização, não como afirmação factual. Evidências fora do quadro ativo não entram no caminho. Esses limites são exibidos/documentados para evitar que uma visualização administrativa seja interpretada como fato canônico.

## Checkpoint

Q07 está aprovado. O próximo e único quadrante autorizado é **Q08 — Planejamento operacional de sessões**, conforme `Q08_PLANEJAMENTO_SESSOES_PROMPT.md`. Q09–Q12 continuam bloqueados por dependência sequencial e não foram antecipados.
