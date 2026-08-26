# V20 — Auditoria da Fronteira de Publicação

## Escopo auditado

Foram revisados o schema Prisma, os guards de acesso, serviços de arquivo, Modo Jogador, relacionamento, quadro, dashboard, busca, campanha, favoritos e as rotas de API correspondentes. O código atual foi tratado como fonte de verdade; nenhum dado fictício, filtro exclusivo de frontend ou mudança de schema foi introduzido nesta auditoria.

## Diagnóstico

> A aplicação já possui conceitos de `PlayerVisibility`, `restrictToGrants`, `CampaignFileGrant`, `PlayerModeConfig` e audiência P1–P4. Contudo, esses critérios estavam implementados em consultas independentes e incompletas. Como resultado, ser membro de uma campanha podia permitir que um jogador recebesse conteúdo não publicado em leituras indiretas ou projeções Prisma amplas.

| Prioridade | Superfície | Problema confirmado | Impacto |
|---|---|---|---|
| CRÍTICO | `fileService.get()` | Usa `assertFileAccess()` que não exige publicação nem exclui arquivo arquivado; retorna tags, anexos, comentários, histórico e relações completos. | Leitura direta por API pode revelar conteúdo privado e metadados associados. |
| CRÍTICO | `fileService.addComment()` e rota de comentários | Cria comentário sem autenticação, campanha, acesso ou autor real. | Escrita anônima/insegura em arquivo conhecido. |
| CRÍTICO | `boardService.get()` | Para jogador filtra apenas lixeira e grants; ignora publicação, arquivo arquivado e Modo Jogador. | Nós, anexos, tags e arestas privadas podem ser revelados. |
| ALTO | `searchService.search()` | Indexa conteúdo, comentários, tags e relações sem exigir publicação, modo habilitado ou exclusão de arquivados. | Vazamento indireto por resultado de busca. |
| ALTO | `campaignDashboardService.get()` | Métricas, sessões, favoritos, arquivos recentes e saúde usam filtros próprios incompletos. | Contagens e nomes privados podem ser expostos a jogadores. |
| ALTO | `campaignService.get()` e favoritos | Inclui `FavoriteFolder.entries.file` completo para todo membro. | Favoritos privados e objetos Prisma amplos chegam ao jogador. |
| ALTO | `favoriteFolderService.list()` e `tagService.list()` | Retornam arquivos/tags de campanha com regra de grant parcial, sem publicação, arquivamento ou Modo Jogador. | Metadados privados são enumeráveis. |
| MÉDIO | `playerModeService` | A leitura pública/authenticated inclui registros Prisma de campanha/arquivo e anexos sem uma projeção explícita. A prévia não usa uma única projeção compartilhada. | Expansão futura pode acrescentar campos privados sem perceber. |
| MÉDIO | `relationshipService` | A política V17 já exige as duas pontas publicadas e o grant, mas possui seu próprio resolvedor e não verifica configuração do Modo Jogador. | Boa proteção local, porém duplicada e não composta com toda a fronteira V20. |

## Guard atual e causa raiz

`getCampaignAccess()` identifica corretamente OWNER ou PLAYER autenticado. `assertFileAccess()` também valida campanha, lixeira e grants para leitura de jogador. Porém, não exige `PlayerVisibility.isVisible`, não exclui arquivo arquivado e não considera o Modo Jogador. Portanto, ele não é uma policy completa de conteúdo publicado e não pode ser usado isoladamente como fronteira player/public.

## Direção V20

A correção será centrada em um novo módulo server-side de publicação. Ele definirá `ViewerContext` para Mestre, jogador P1–P4 e link público; produzirá um `CampaignFileWhereInput` seguro; verificará arquivo individual e fornecerá projeções explícitas de arquivo, tag, anexo e campanha para cada contexto. Serviços e rotas reutilizarão a mesma política; `Relationship` e `BoardEdge` continuarão suas estruturas oficiais e independentes.

## Banco e migrations

Não há mudança de schema indispensável para aplicar esta fronteira. Os campos necessários já existem: `PlayerVisibility`, `restrictToGrants`, `CampaignFileGrant`, `PlayerModeConfig.isEnabled` e `CampaignMember.audience`. Logo, não será criada migration na V20.

## Riscos e validação planejada

O principal risco é corrigir o acesso de jogador de forma excessiva e afetar uma tela legítima. Para reduzir esse risco, a V20 separará explicitamente Master, jogador autenticado e link público; preservará Owner sem filtro de publicação e cobrirá matriz de audiência, grants, arquivo privado/arquivado/lixeira, Modo Jogador, leitura direta, comentário, anexo, busca, dashboard, favoritos, quadro e relações.
