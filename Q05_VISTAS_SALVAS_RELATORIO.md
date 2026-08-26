# Q05 — Vistas salvas por sessão, caso ou arco

**Status: APROVADO**  
**Data:** 25 de agosto de 2026  
**Escopo:** somente vistas administrativas do Quadro de Investigação.

## Resultado

Q05 foi concluído e aprovado. O Mestre pode criar, listar, restaurar, atualizar, reordenar e remover vistas nomeadas dos tipos **Sessão**, **Caso** e **Arco**. Cada vista guarda apenas uma configuração de navegação do quadro; ela não duplica, substitui ou altera `CampaignFile`, `BoardNode`, `BoardEdge`, `Relationship`, hipótese, evidência, pin ou grupo.

A restauração aplica somente estado local ao editor administrativo: viewport, filtros, camadas e referências válidas de anotações. Não há escrita no quadro canônico durante a restauração. As rotas e o painel continuam fora do fluxo de jogador e de link público.

## Decisão de modelagem

`InvestigationBoardView` é uma entidade própria, **campaign-scoped**, com `campaignId`, nome, tipo, descrição opcional, ordem, timestamps e um snapshot JSON limitado. O snapshot contém somente os campos de navegação permitidos: pan, zoom, filtros, camadas e listas de IDs de pins/grupos.

Pins e grupos continuam pertencendo ao quadro/campanha, não à vista. Uma vista apenas referencia essas anotações. Na criação e atualização, IDs de pin ou grupo inexistentes, de outra campanha ou incompatíveis com o quadro são rejeitados. Na listagem, referências que desapareceram depois da criação são omitidas e retornadas como aviso seguro, sem criar registros fantasmas.

| Decisão | Regra efetiva |
| --- | --- |
| Pertencimento | A vista pertence a uma campanha e a uma única campanha. |
| Conteúdo | Snapshot de navegação; não copia conteúdo nem posições canônicas. |
| Tipos | `SESSION`, `CASE` e `ARC`, expostos como Sessão, Caso e Arco. |
| Referências | Pins e grupos são referenciados por ID; importação usa índices estáveis e remapeia para os novos IDs. |
| Ausências posteriores | Referências ausentes são omitidas na leitura com warning; não há registros fantasmas. |
| Restauração | Operação local e reversível do estado do editor; nenhuma mutação de banco canônico. |
| Visibilidade | OWNER-only em serviço e API; jogador e público não recebem vistas. |

## Schema e migration

Foi adicionada a migration aditiva `20260825120000_q05_board_views`. Ela cria o enum `InvestigationBoardViewKind`, a tabela `InvestigationBoardView`, índices por campanha/ordem e campanha/tipo, além da FK campaign-scoped com exclusão em cascata conforme o padrão do projeto. A SQL foi revisada manualmente a partir de um diff controlado; renomes de constraints preexistentes de `Relationship` foram deliberadamente excluídos por estarem fora do escopo.

A migration foi aplicada **somente no PostgreSQL isolado de teste**, via `pnpm exec prisma migrate deploy`, depois da revisão sem escrita. Nenhuma operação foi executada em produção ou em banco compartilhado. Não foram usados `migrate reset`, `DROP`, seed amplo ou reparo manual.

## Backend e contratos

O serviço `boardViewService` centraliza autorização OWNER-only, escopo por campanha, normalização do snapshot, limites de nome/descrição/payload, duplicidade por campanha, validação de referências, listagem com sanitização de referências ausentes, atualização, remoção e reordenação transacional.

As rotas administrativas implementadas são `GET/POST /api/campaigns/[id]/board/views`, `PATCH/DELETE /api/board/views/[id]` e `PUT /api/campaigns/[id]/board/views/reorder`. Respostas de erro permanecem sob o contrato público seguro existente, sem ecoar detalhes internos, URLs, credenciais, IDs reais ou conteúdo de campanha.

A API cliente `boardViewsApi` foi adicionada aos contratos existentes. O painel `BoardViewsPanel` usa o mesmo host administrativo do quadro, com estados vazios, busy state, foco nativo, ações nomeadas e controles de reordenação. A semântica atual salva todas as anotações disponíveis por padrão; quando uma vista restaurada limita as referências visuais, a atualização mantém o snapshot restaurado em vez de ampliar silenciosamente o recorte.

## Exportação e importação

O documento administrativo de transferência passou a incluir `board.views`. Na exportação, IDs internos de pins e grupos são convertidos em índices estáveis do documento. Na importação, pins e grupos são recriados primeiro, os índices são remapeados para os novos IDs e só então as vistas são criadas. O resumo e o dry-run também informam vistas e rejeitam snapshots inválidos antes da criação.

A compatibilidade legada permanece: documentos sem `board.views` continuam válidos. Vistas não são adicionadas a payloads de jogador ou público e não são usadas como fonte de publicação.

## Validações executadas

| Gate | Resultado |
| --- | --- |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| `pnpm exec next lint --dir src` | PASS |
| `pnpm exec vitest run --run` | **34 suítes / 213 testes PASS** |
| `pnpm run build` | PASS — compilação de produção concluída |
| `pnpm run test:db:board-views` | PASS — persistência, índices de exportação, remapeamento, cascade e isolamento do jogador |
| Captura autenticada administrativa | PASS — criação, restauração local, reordenação e remoção validadas |

O script de banco usa obrigatoriamente `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1` e limpa apenas campanhas, usuário, pins, grupos e vistas temporárias criados pelo próprio teste. A rejeição de serviço cross-campaign permanece coberta no teste unitário, pois o serviço depende do contexto de request para autenticação; o script de banco valida diretamente a persistência e as constraints sem contornar autorização em produção.

A evidência visual anonimizada está em [`evidence/q05/q05-vistas-anonimizado.webp`](evidence/q05/q05-vistas-anonimizado.webp). O registro textual da navegação está em [`Q05_BROWSER_FINDINGS.md`](Q05_BROWSER_FINDINGS.md). As capturas distribuíveis ocultam a navegação da campanha e os dados do quadro.

## Segurança, isolamento e regressão

A rota administrativa continua separada de `/campaigns/[id]/jogador/investigacao` e de qualquer projeção pública. Não há imports de `BoardViewsPanel`, `boardViewsApi` ou tipos administrativos de vista no componente do jogador. Nenhuma vista pode criar ou inferir `Relationship`; `Relationship` segue como fato oficial, enquanto `BoardEdge` permanece visual.

O teste visual criou apenas duas vistas temporárias, alternou zoom e camada de relações, restaurou o snapshot e reordenou os cartões. As duas vistas foram removidas pela interface. A leitura final mostrou zero vistas temporárias, os nós e relações oficiais permaneceram presentes e o quadro canônico não foi modificado.

## Rollback e limitações

O rollback de schema é reversível por uma migration posterior controlada que remova exclusivamente a tabela/enum Q05 após auditoria de dependências; não foi executado rollback. O rollback funcional imediato consiste em remover o painel/rotas/cliente Q05 e manter os dados isolados até uma migration de reversão aprovada. A restauração local não requer rollback de dados porque não muta o quadro.

A migration Q05 foi aplicada apenas no banco de teste. O layout visual validado é o painel administrativo desktop em viewport de captura; os estilos incluem adaptação responsiva e foco, mas não foi criada uma segunda evidência móvel nesta etapa. A tela não oferece um seletor de subset para uma vista nova: o padrão é salvar as referências válidas disponíveis, enquanto uma vista restaurada preserva seu recorte ao ser atualizada. Essas limitações são explícitas e não bloqueiam os critérios de Q05.

## Transição

Com Q05 aprovado, o próximo marco autorizado é Q06, exclusivamente para diagnósticos investigativos determinísticos e integração OWNER-only com o Compilador. Q07 e os demais quadrantes permanecem fora do escopo deste relatório.
