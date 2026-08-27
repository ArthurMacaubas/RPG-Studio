# Quadro 02 — Ergonomia e diagnósticos acionáveis

**Projeto:** RPG Campaign Studio
**Incremento:** Quadro de Investigação — Quadro 02
**Status:** EM VALIDAÇÃO FINAL
**Escopo:** somente a superfície administrativa do Quadro de Investigação.

## 1. Contexto e decisão

O painel de Hipóteses/Evidências já estava efetivamente integrado à rota administrativa do quadro, portanto o pré-requisito do prompt foi atendido. A implementação foi feita dentro de `InvestigationBoardEditor`, sem criar uma segunda superfície de investigação.

O incremento usa apenas dados já carregados no editor OWNER. Busca, filtros, camadas, foco e diagnósticos são estados de apresentação locais. A função pura `computeInvestigativeDiagnostics` continua sendo a fonte determinística dos diagnósticos; a UI apenas exibe itens explicáveis e executa navegação/foco explícitos.

Não houve alteração de schema, migration, importação/exportação, política de publicação, endpoint público, Modo Jogador, Área do Jogador, DTO público, Compilador global ou dependências.

## 2. Entregas implementadas

| Entrega | Implementação |
| --- | --- |
| Barra de exploração | Busca local normalizada, contador de resultados, filtros de tipo, escopo, tags, favoritos e investigação. |
| Busca contextual | Pesquisa por nome, tipo, descrição, conteúdo, dados carregados, tags e título/resumo de hipóteses vinculadas. Não há request por tecla. |
| Filtros de investigação | Presença no canvas, uso como evidência, vínculo a hipótese aberta e relação oficial crítica/importante. Filtros combinam e são reversíveis. |
| Camadas | Toggles existentes para fichas, `BoardEdge` visual, relações oficiais, evidências, hipóteses e pins/grupos, com legenda textual. |
| Resultados | Lista local limitada às fichas carregadas, com foco para nós existentes e ações separadas de abrir/adicionar para fichas fora do canvas. |
| Foco | Foco visual temporário de nó, seleção de hipótese pelo painel existente, seleção somente leitura de relação oficial e limpeza explícita com botão/Escape. |
| Diagnósticos | Drawer recolhível `Diagnósticos do Quadro`, estados vazio/positivo e severidade textual: Alta, Atenção e Informação. |
| Ações | Abrir hipótese, focar ficha, abrir vistas ou focar endpoint existente de relação; nenhuma correção automática. |
| Acessibilidade | `aria-pressed`, `aria-expanded`, nomes acessíveis, foco visível, operação por teclado e respeito a `prefers-reduced-motion`. |

## 3. Regras de diagnóstico

Foram preservadas as regras reais existentes e adicionada a regra de hipótese refutada sem evidência contrária. Os diagnósticos retornam IDs estáveis, explicação curta, entidades relacionadas e ação de navegação.

| Regra | Severidade na UI | Ação |
| --- | --- | --- |
| Hipótese aberta sem evidência | Atenção | Abrir hipóteses |
| Hipótese sustentada sem `SUPPORTS` | Alta | Abrir hipóteses |
| Hipótese refutada sem `CONTRADICTS` | Atenção | Abrir hipóteses |
| Evidências sustentando e contradizendo a mesma hipótese | Atenção | Revisar hipóteses |
| Evidência ligada a arquivo arquivado ou na lixeira | Atenção | Abrir hipóteses; nenhuma substituição automática |
| Pista crítica sem hipótese | Atenção | Focar ficha |
| Relação oficial importante fora do quadro ativo | Atenção | Focar endpoint visível e revisar/adicionar manualmente o ausente |
| Referência inválida de pin/grupo em vista salva | Alta | Abrir vistas salvas |

As regras são calculadas somente para dados administrativos efetivamente disponíveis no editor. Ausência de uma coleção não gera alerta especulativo.

## 4. Matriz de acesso e isolamento

| Superfície | Resultado |
| --- | --- |
| OWNER no quadro administrativo | Pode usar busca, filtros, camadas, foco e diagnósticos. |
| PLAYER autenticado | Não importa componentes, tipos ou dados do Quadro 02. |
| Link público | Não importa componentes, tipos ou dados do Quadro 02. |
| Modo Jogador | Não importa componentes, tipos ou dados do Quadro 02. |
| Relação oficial | Continua fonte canônica somente leitura no overlay. |
| Persistência | Nenhum filtro ou diagnóstico escreve no banco. |

## 5. Arquivos alterados

Os arquivos principais são `InvestigationBoardEditor.tsx`, `InvestigationFiltersPanel.tsx`, `investigationBoardFilterLogic.ts`, `HypothesesPanel.tsx`, `investigativeDiagnostics.ts` e seus testes. Foram adicionados `InvestigationDiagnosticsPanel.tsx`, seu CSS Module, `investigationDiagnostics.module.css`, `QUADRO_02_BASELINE.md` e `QUADRO_02_DECISAO.md`.

## 6. Validação automatizada

A suíte focada do incremento passou com 3 arquivos e 19 testes. A suíte completa passou com **44 arquivos e 271 testes**. Também passaram TypeScript estrito, Prisma generate, Prisma format check, Prisma validate, lint e build de produção. O diff passou `git diff --check`.

A revisão de segurança não encontrou URL PostgreSQL, credencial, token, chave privada ou arquivo de ambiente no diff. A migration e as operações persistentes não foram alteradas, pois este marco é deliberadamente local e não persistente.

## 7. Validação manual

A validação manual deve ser feita autenticado como OWNER, cobrindo abertura/fechamento de Explorar e Diagnósticos, busca normalizada, filtros combináveis, camadas, seleção de hipótese, foco de evidência, relação oficial somente leitura, limpeza por botão/Escape, teclado e viewport estreito. A evidência final será registrada de modo anonimizado, sem nomes reais de campanha, IDs, URLs internas, hosts ou credenciais.

## 8. Riscos residuais e não-escopo

Filtros e diagnósticos são locais e não sincronizam entre dispositivos. Fichas fora do escopo atualmente carregado não são inferidas. Relações incompletas continuam exigindo decisão manual do Mestre. Não foram iniciados auto-layout, novas vistas, projeção de jogador, IA, rate limiting, storage ou a frente seguinte.

O próximo candidato, somente após aprovação deste marco, é a recuperação operacional de sessões e integrações de contexto com o Quadro.
