# Q04 — Pins, notas e agrupamentos visuais

**Status: APROVADO.** O quadrante Q04 foi concluído após o gate de Q03, sem iniciar Q05. A entrega adiciona anotações visuais persistidas exclusivamente ao quadro administrativo: pins textuais e agrupamentos de nós existentes. Nenhum elemento foi convertido em ficha, `Relationship`, `BoardEdge`, hipótese ou evidência.

## Escopo entregue

Foram adicionadas as entidades `InvestigationBoardPin`, `InvestigationBoardGroup` e `InvestigationBoardGroupItem`. Pins armazenam texto curto, posição e cor. Grupos armazenam nome, cor, posição, dimensões e a composição por `BoardNode`. A composição usa referências compostas com `campaignId`, impedindo referências cross-campaign no banco e evitando cópia de conteúdo de arquivos.

O editor administrativo ganhou carregamento separado, camada local `Anotações do Mestre`, painel de criação/edição/remoção, seleção de fichas para grupos, posicionamento por coordenadas, estado vazio e renderização visual atrás dos nós. Os controles têm labels, foco nativo, `aria-label`, `aria-pressed`, limites de tamanho e feedback de sucesso/erro. As preferências de camada não são persistidas.

A autorização é `OWNER`-only e campaign-scoped em todas as operações. As rotas públicas do jogador e as projeções públicas não consultam o domínio Q04. A exclusão de um grupo remove sua composição; a exclusão de um nó remove seus itens por cascata, sem remover arquivos ou relações oficiais.

## Transferência administrativa

O formato administrativo de exportação/importação recebeu campos opcionais `board.pins` e `board.groups`, mantendo documentos legados válidos quando esses campos não existem. A validação rejeita texto vazio ou acima do limite, posições/dimensões inválidas, cores inválidas, referências ausentes e duplicidades. Na importação, grupos são recriados depois dos nós e suas referências são remapeadas por `fileId`; não há alteração na exportação do jogador ou pública.

## Migration e banco

A decisão de modelagem foi registrada em `Q04_MODELING_DECISION.md` antes da alteração do schema. A migration aditiva `20260825110000_q04_board_pins_groups` foi revisada e aplicada somente ao PostgreSQL isolado de teste. Não foi usado reset, drop, seed amplo ou limpeza global.

A integração `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm exec tsx scripts/board-annotations-db.ts` foi aprovada. O teste confirmou persistência, exportação administrativa, importação com remapeamento, rejeição de referências cross-campaign, rejeição de nó ausente, cascata da composição e separação de `Relationship`/`BoardEdge`. Os registros temporários foram removidos no bloco de limpeza do próprio teste; a validação visual também removeu pela interface o pin e o grupo temporários criados para a captura.

## Validação técnica

| Verificação | Resultado |
|---|---:|
| `pnpm exec prisma generate` | PASS |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| `pnpm exec next lint --dir src` | PASS |
| `pnpm exec vitest run --run` | PASS — 31 suítes / 199 testes |
| `pnpm run build` | PASS — compilação concluída; avisos não bloqueantes |
| Integração PostgreSQL específica de Q04 | PASS |
| Captura administrativa autenticada | PASS — painel, camada, criação/listagem/remoção e retorno ao contador zero |

A captura visual `evidence/q04/q04-pins-grupos-anonimizado.webp` foi produzida com textos anonimizados apenas no DOM, sem persistência dessa anonimização. O arquivo `Q04_BROWSER_FINDINGS.md` registra o fluxo visual e a limpeza.

## Arquivos principais

| Área | Arquivos |
|---|---|
| Schema/migration | `prisma/schema.prisma`, `prisma/migrations/20260825110000_q04_board_pins_groups/migration.sql` |
| Domínio/API | `src/services/boardAnnotationService.ts`, `src/app/api/campaigns/[id]/board/annotations/route.ts`, `src/app/api/board/annotations/pins/[id]/route.ts`, `src/app/api/board/annotations/groups/[id]/route.ts` |
| Cliente/tipos | `src/lib/api.ts`, `src/types/index.ts` |
| Editor | `InvestigationBoardEditor.tsx`, `BoardAnnotationsPanel.tsx`, `InvestigationFiltersPanel.tsx`, `page.module.css`, `investigationFilters.module.css` |
| Transferência | `src/services/campaignTransferService.ts` |
| Testes | `boardAnnotationService.test.ts`, `campaignTransferBoardAnnotations.test.ts`, `campaignTransferExport.test.ts`, `campaignTransferBoardCurve.test.ts`, `InvestigationBoardQ04.test.ts` |

## Limitações e próximo gate

Q04 não inclui vistas salvas, diagnósticos, auto-layout, caminhos de pistas, planejamento de sessões, briefing de jogador, rate limiting, object storage ou centro de backup. Esses temas permanecem fora do marco.

O próximo gate é Q05 — vistas salvas por sessão/caso/arco. Ele deverá definir o pertencimento de pins/grupos à vista, o remapeamento de referências e a restauração sem alterar o quadro canônico. Q05 não deve iniciar sem ler este relatório, `Q04_PINS_NOTAS_GRUPOS_PROMPT.md`, o schema/migration e os contratos de transferência.
