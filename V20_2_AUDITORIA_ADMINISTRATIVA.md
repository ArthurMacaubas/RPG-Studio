# V20.2 — Auditoria de Superfícies Administrativas

## Escopo e decisão de produto

Foram auditados `campaignHealthService`, as rotas `health` e `health/simulate`, `timelineService`, a rota de timeline, `relationshipService`, `publicationPolicy.ts`, guards centrais e testes existentes. A V20.1 já centralizou a publicação de arquivo; esta etapa não cria política paralela, não cria relação paralela e não requer schema ou migration.

Health/Compilador e timeline permanecem **OWNER-only**. Essa é a escolha explícita para evitar que jogador receba diagnósticos, nomes, IDs, caminhos, puzzles, nós bloqueados, sessões ou referências administrativas. A timeline de jogador, se for desejada em uma versão futura, deverá ser uma superfície pública própria construída sobre `publicationPolicy.ts`, e não uma projeção parcial da timeline administrativa.

## Falhas confirmadas

| Prioridade | Superfície | Falha | Correção definida |
|---|---|---|---|
| CRÍTICO | `computeCampaignHealth` | Bastava `assertCampaignAccess`; um PLAYER podia receber `CampaignHealth` com nomes, IDs, caminhos, estado de puzzle, nós bloqueados e referências quebradas. | Exigir `assertCampaignRole(campaignId, 'OWNER')` no serviço. |
| CRÍTICO | `GET /health` e `POST /health/simulate` | Repassavam o compilador diretamente. | Manter os endpoints, mas depender do serviço owner-only e retornar o erro padronizado. |
| ALTO | `timelineService.list` | Bastava acesso de campanha e incluía `file: true`, retornando objeto Prisma amplo e eventos ligados a arquivo privado/arquivado/lixeira. | Exigir Mestre em todas as operações administrativas e usar projeção explícita. |
| MÉDIO | Relações | `get`, `getForEntity`, `getGraph`, `listForPlayer` já exigem Modo Jogador via `getRelationshipViewer`, mas ainda repetem resolvedores de IDs para player e público. | Reutilizar `publicationPolicy` para o contexto e o predicado de arquivo; preservar audiência V17 e a exigência de Modo Jogador. |

## Respostas esperadas

| Contexto | Health / simulate | Timeline administrativa | Relações player-facing |
|---|---|---|---|
| OWNER | Permitido | Permitido | Permitido, sem filtro de publicação. |
| PLAYER P1–P4 | `403` de papel administrativo | `403` de papel administrativo | Permitido apenas com Modo Jogador ativo, publicação, grants e audiência V17. |
| Público | `401` por não haver sessão | `401` por não haver sessão | Apenas `listForPublic`, com Modo Jogador ativo e conteúdo `ALL` publicado. |

O retorno `403` para membro autenticado é coerente com `assertCampaignRole`; o recurso não é privado por existência de campanha, mas a operação administrativa exige Mestre. Leituras de arquivo/relacionamento privadas mantêm `404` para não revelar existência.

## Banco e relacionamentos

Não há alteração de schema. `Relationship`/`RelationshipType` continuam oficiais, enquanto `BoardNode`/`BoardEdge` continuam representação visual. A recomendação V20.1 de FK composta para integridade cruzada permanece documentada e não será aplicada nesta etapa.
