# Baseline — Quadro 02: ergonomia e diagnósticos

**Projeto:** RPG Campaign Studio
**Incremento:** Quadro 02 — ergonomia e diagnósticos acionáveis
**Estado da auditoria:** pré-requisito atendido; implementação liberada no escopo administrativo.

## 1. Evidência do estado real

A rota administrativa `/campaigns/[id]/investigacao` monta `InvestigationBoardEditor`. O editor já carrega nós, `BoardEdge`, arquivos, relações oficiais, pins, grupos, vistas e hipóteses. O `HypothesesPanel` está efetivamente integrado ao editor e já possui seleção de hipótese, filtros locais, destaque de evidências, foco de ficha e fluxo existente de adicionar ficha ao quadro. Portanto, o bloqueio “QUADRO 01.1 incompleto” não se aplica.

## 2. Funcionalidades existentes

| Área | Estado auditado |
| --- | --- |
| Nós e arestas visuais | CRUD administrativo existente, com pan, zoom, arraste e conexão manual. |
| Relações oficiais | Overlay somente leitura separado de `BoardEdge`, seleção e detalhes de origem/destino. |
| Hipóteses/evidências | Painel integrado, OWNER-only pela rota administrativa, filtros locais e destaque de evidências. |
| Pins e grupos | Camada administrativa existente com CRUD e toggle visual. |
| Vistas salvas | Snapshots existentes para navegação, filtros, camadas e referências de anotações. |
| Filtros locais | Já existem busca de arquivo, tipo, tags, escopo, favoritos, relação e hipóteses; a busca não inclui título de hipótese/tag textual de modo combinado. |
| Diagnósticos | `computeInvestigativeDiagnostics` já existe como função pura e cobre regras principais, mas não é consumida pela UI do quadro. |
| API/DB | O Quadro 02 não precisa de endpoint, migration, importação/exportação ou alteração persistente. |
| Superfícies públicas | Não serão alteradas nem importarão componentes/tipos do Quadro 02. |

## 3. Lacunas priorizadas

A lacuna de maior valor e menor risco é integrar a função pura de diagnósticos ao editor e oferecer um painel recolhível com ações de navegação. Em seguida, a barra de exploração deve combinar a busca já carregada com hipóteses, tags e presença no canvas, sem consulta por tecla e sem mutação.

O foco de arquivo já existe para nós e o painel de hipóteses já pode chamar `onFocusFile`/`onAddToBoard`; o incremento deve completar o comportamento para busca e diagnósticos. O overlay de relação oficial já é semanticamente separado de `BoardEdge`; seus controles devem permanecer somente leitura.

## 4. Regras de segurança e não-escopo

Toda a superfície permanece administrativa e OWNER-only por meio da rota existente. Filtros, camadas, foco e diagnósticos são estado de apresentação local. Nenhuma ação automática cria, edita, remove ou reposiciona `Relationship`, `BoardEdge`, hipótese, evidência, pin, grupo, vista, sessão ou arquivo.

O incremento não tocará em `prisma/schema.prisma`, migrations, políticas de publicação, rotas de jogador, link público, Modo Jogador, importação/exportação, Compilador global, auto-layout, IA, Redis, object storage ou novas dependências.

## 5. Critérios de aceite

A entrega será considerada aprovada quando busca normalizada, filtros combináveis, camadas, foco, diagnósticos determinísticos e ações de navegação estiverem cobertos por testes puros/administrativos; o painel estiver acessível e responsivo; os gates locais passarem; e uma verificação manual OWNER confirmar abertura/fechamento de painéis, teclado, Escape, foco, limpeza e viewport estreito sem alteração automática de dados.
