# Quadro 02 — Ergonomia e diagnósticos acionáveis

**Projeto:** RPG Campaign Studio
**Incremento:** Quadro de Investigação — Quadro 02
**Status:** APROVADO
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

### Correção QUADRO 02.1 — diagnóstico de evidência mista

A revisão posterior identificou um falso positivo na regra `HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE`: a condição anterior emitia o alerta com qualquer evidência `CONTRADICTS`, inclusive quando a hipótese tinha apenas evidência contrária. Isso era incompatível com a mensagem e a decisão técnica da regra, que representam a coexistência de evidências favoráveis e contrárias.

A função pura `computeInvestigativeDiagnostics` agora calcula, sem mutar a entrada, as coleções `supports` e `contradicts` para cada hipótese e emite o diagnóstico somente quando `supports.length > 0 && contradicts.length > 0`. O status `OPEN`, `SUPPORTED` ou `REFUTED` não funciona como bypass. Severidade, IDs estáveis, ordenação, explicação, ação de revisão e todas as demais regras foram preservados.

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

A validação anterior do Quadro 02 registrava a suíte focada com 3 arquivos e 19 testes e a suíte completa com **44 arquivos e 271 testes**. Para o QUADRO 02.1, a suíte focada de `src/services/investigativeDiagnostics.test.ts` passou com **1 arquivo e 8 testes**, e a suíte completa passou novamente com **44 arquivos e 271 testes**. Também passaram TypeScript estrito, Prisma generate, Prisma format check, Prisma validate, lint e build de produção. O diff passou `git diff --check`.

A revisão de segurança não encontrou URL PostgreSQL, credencial, token, chave privada ou arquivo de ambiente no diff. Não houve migration, script PostgreSQL, alteração de schema, persistência, importação/exportação, rota, API, UI, publicação ou execução de browser, pois esta correção é deliberadamente pura e não persistente.

## 7. Validação manual

A validação manual foi executada no deployment de produção autenticado como OWNER usando uma campanha sintética de teste. Foram confirmados: abertura e fechamento de Explorar; abertura e fechamento do drawer Diagnósticos com estado vazio positivo; busca local; contador e lista de resultados; filtro de presença `No canvas`; ações Focar; relação oficial somente leitura; e ausência de navegação ou gravação ao alterar filtros. O filtro foi limpo ao final e nenhum dado foi criado ou alterado.

A validação foi registrada de modo anonimizado, sem nomes reais de campanha, IDs, URLs internas de preview, hosts ou credenciais. A revisão de viewport estreito permanece coberta pelos estilos responsivos e pelo build; não foi feita alteração persistente para essa verificação.

## 8. Riscos residuais e não-escopo

Filtros e diagnósticos são locais e não sincronizam entre dispositivos. Fichas fora do escopo atualmente carregado não são inferidas. Relações incompletas continuam exigindo decisão manual do Mestre. A correção 02.1 não altera essas fronteiras e não cria novas regras, severidades, superfícies administrativas ou projeções de jogador.

O QUADRO 02.1 está aprovado tecnicamente, mas o próximo candidato continua bloqueado até o aceite formal solicitado no prompt: a recuperação operacional de sessões e integrações de contexto com o Quadro.
