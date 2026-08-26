# V17 — Relationship Integrity & Security

## 1. Alterações no banco

A V17 adicionou a audiência persistente opcional `CampaignMember.audience` e
ampliou `RelationshipVisibility` com `P1`, `P2`, `P3` e `P4`. O slot de
audiência é único por campanha quando definido. O modelo `Relationship` recebeu
a garantia física de unicidade por `campaignId`, `fromId`, `toId` e `typeId`.
Nenhum registro de relacionamento foi removido.

## 2. Migrations

Foi criada e aplicada no Neon a migration
`20260822115559_relationship_integrity_security`. Antes dela, o script
`scripts/audit-relationship-integrity.mjs` identificou **0 grupos duplicados**,
**0 relações entre campanhas diferentes** e **0 tipos específicos fora da
campanha**. A migration contém uma pré-checagem que interrompe a aplicação em
qualquer ambiente com duplicações não auditadas, em vez de apagar ou mesclar
dados silenciosamente.

## 3. Segurança

`relationshipService` passou a centralizar a audiência e a acessibilidade das
duas entidades. Mestre recebe todas as relações da campanha. Jogador `P1` vê
somente `ALL` e `P1`; a mesma regra vale para `P2`, `P3` e `P4`. Jogador sem
slot recebe apenas `ALL`. Além disso, para jogador, origem e destino precisam
estar publicados, não arquivados/nem descartados e passar pelo grant individual
quando necessário. Relações e arquivos fora desse subconjunto retornam `404`.

As funções `get()`, `getForEntity()`, `getGraph()` e `listForPlayer()` usam a
mesma política. `listForPlayer()` também recalcula a interseção com os arquivos
realmente acessíveis, não confiando nos IDs fornecidos por um chamador interno.
O Modo Jogador autenticado e público agora chama o core em vez de repetir a
consulta de relações. A página pública não possui identidade de membro e,
portanto, recebe somente `ALL`.

## 4. Relacionamentos

Criação, edição, exclusão, listagem por entidade e grafo continuam concentradas
no serviço. Relações entre campanhas e tipos específicos de outra campanha são
rejeitados. `RelationshipKind` e `kind` foram preservados exclusivamente como
espelho de compatibilidade para backups legados; os novos fluxos continuam
orientados por `typeId`.

## 5. Unicidade

A constraint única do banco torna concorrência segura mesmo quando duas
requisições atravessam a checagem prévia simultaneamente. O serviço já retorna
conflito `409` para duplicatas conhecidas; uma colisão concorrente do Prisma
(`P2002`) é convertida pelo adaptador central de erros em `409`, sem resposta
500 genérica.

## 6. Direção

Registros continuam armazenados como `fromId → toId`. Tipos direcionais exibem
`→` na origem e `←` no destino. Tipos com `directional = false` mantêm um único
registro, mas o `RelationshipManager` apresenta `↔` e identifica a relação
como não direcional.

## 7. JSON

Exportação agora inclui ID de relacionamento e ID/escopo de cada
`RelationshipType`, além de tipo, rótulo, descrição, importância, visibilidade
e timestamps. Importação padrão continua criando uma nova campanha e remapeando
IDs. A assinatura de importação já oferece o modo futuro
`PRESERVE_WHEN_AVAILABLE` para restaurações em ambiente compatível, sem criar
interface adicional nesta versão. O validador bloqueia referências inexistentes
e relações duplicadas antes da transação.

## 8. APIs alteradas

| Endpoint | Alteração |
|---|---|
| `GET /api/relationships?fileId=` | Passou a aplicar audiência e acessibilidade de ambas as pontas. |
| `GET /api/relationships/[id]` | Oculta relações não permitidas como inexistentes. |
| `POST`/`PATCH /api/relationships` | Aceitam `P1`–`P4` e preservam resposta de conflito. |
| `GET /api/campaigns/[id]/relationships/graph` | Herda o mesmo filtro centralizado do serviço. |
| `PATCH /api/campaigns/[id]/members` | Permite ao Mestre atribuir ou remover audiência P1–P4 de um jogador. |

## 9. Testes

A V17 adicionou matriz de audiência para Mestre e P1–P4, bloqueio de relações
`GM`, bloqueio por entidade privada, consistência de `getForEntity`, grafo e
`listForPlayer`, direção, campanha cruzada, tipo inexistente, conflito prévio,
JSON com IDs/metadados e duplicação de JSON. A suíte final executada contém 43
testes automatizados.

## 10. Problemas encontrados

O primeiro `migrate deploy` recebeu uma falha transitória `P1001` de conexão
com o Neon. A consulta de status subsequente confirmou a conexão e que a
migration continuava pendente; o deploy repetido foi aplicado com sucesso.
Não há problema de integridade de dados pendente identificado na auditoria.

## 11. Compatibilidade

Quadro de Investigação e `BoardEdge` continuam estruturas visuais separadas e
não são convertidos automaticamente em `Relationship`. O Compilador mantém o
uso do nome do tipo extensível como label de aresta. O fluxo padrão de importação
continua remapeando IDs para uma campanha nova. Nenhuma funcionalidade existente
foi removida.

## 12. Pendências

Versões futuras podem adicionar uma política mais granular por membro baseada
em identidade/grants, fluxo explícito de restauração com preservação de IDs e
revelações/dependências. Esses itens não foram iniciados nesta versão.

## 13. Status

> **V17 PRONTA**
