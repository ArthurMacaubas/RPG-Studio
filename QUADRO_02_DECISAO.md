# Decisão técnica — Quadro 02

## Decisão

Implementar o incremento exclusivamente dentro da superfície administrativa já montada por `InvestigationBoardEditor`. O painel existente de Hipóteses/Evidências será a fonte de seleção e destaque; não será criada uma segunda superfície de investigação.

A busca e os filtros continuarão sendo estado local. A função pura `computeInvestigativeDiagnostics` será reutilizada como fonte determinística de sugestões, com uma apresentação recolhível `Diagnósticos do Quadro` e ações de navegação explícita. Nenhuma ação de diagnóstico terá mutação automática.

## Dados permitidos

O editor já carrega os dados administrativos necessários: nós e arestas visuais do quadro, arquivos no escopo selecionado, relações oficiais, hipóteses/evidências, pins, grupos e vistas. Evidências carregadas dentro de hipóteses preservam o estado real do arquivo, permitindo sinalizar arquivo arquivado ou na lixeira sem consulta nova. O diagnóstico de pistas críticas será limitado aos arquivos administrativos efetivamente carregados.

## Busca e filtros

A normalização será case-insensitive e accent-insensitive com `normalize('NFD')`, removendo marcas diacríticas. A coleção derivada será memorizada e combinará nome, tipo, descrição/conteúdo, tags carregadas, títulos/resumos de hipóteses e fichas associadas a evidências. O estado de busca será local e não fará request por tecla.

Os filtros de apresentação ocultarão nós, arestas visuais, relações oficiais, evidências/hipóteses e anotações sem alterar o canvas persistido. Quando filtros de investigação dependerem de hipóteses já carregadas, serão aplicados localmente; ausência de dados carregados não produzirá diagnóstico especulativo.

## Foco

O foco de ficha reutilizará `focusFile`, centralizando apenas nós existentes e aplicando destaque temporário. Para fichas fora do canvas, a UI oferecerá `onAddToBoard` já existente ou abrirá a ficha, sem duplicar `BoardNode`. O foco de hipótese continuará selecionando o painel integrado; relações oficiais continuarão somente leitura e com atalhos separados de origem e destino. Escape limpará foco e painéis contextuais.

## Não-escopo

Não alterar `prisma/schema.prisma`, migrations, importação/exportação, políticas de publicação, rotas públicas, DTOs de jogador, Modo Jogador, Compilador global, auto-layout, IA, integrações externas, Redis, object storage ou dependências.
