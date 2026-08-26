# Proposta de desenho — Relationship Core extensível

## Fonte única de verdade

`Relationship` continuará sendo o único registro oficial de conexão entre dois
`CampaignFile`. O Quadro de Investigação continuará usando `BoardEdge` apenas
como disposição visual; nenhum `BoardEdge` será convertido automaticamente em
relacionamento oficial e nenhuma relação oficial criará hipótese visual.

## Campos propostos

| Elemento | Decisão |
|---|---|
| `Relationship.campaignId` | Obrigatório após o preenchimento por `from.campaignId`; permite filtro seguro e eficiente por campanha. |
| `fromId` / `toId` | Mantidos como direção oficial. A validação de serviço impede pares de campanhas diferentes e auto-relação. |
| `typeId` | Referência obrigatória ao novo `RelationshipType` para todos os registros novos. |
| `kind` legado | Mantido temporariamente e preenchido para os seis tipos existentes. Novos tipos recebem `GENERIC` somente como espelho de compatibilidade até a remoção futura do enum. |
| `label` / `description` | Textos distintos: rótulo curto e contexto narrativo longo. |
| `importance` | Enum controlado `CRITICAL`, `IMPORTANT`, `NORMAL`, `OPTIONAL`, com padrão `NORMAL`. |
| `visibility` | Enum inicial `GM` e `ALL`, com padrão `GM`. A concessão individual por jogador não será simulada por strings como `P1`; uma futura evolução deve reutilizar `CampaignMember`/grants. |
| `updatedAt` | Rastreamento de edição compatível com auditoria e exportação. |

## RelationshipType

`RelationshipType` terá `id`, `campaignId` opcional, `key`, `name`,
`description`, `directional`, `color`, `icon`, `createdAt` e `updatedAt`.
Tipos globais usam `campaignId = null`; tipos personalizados pertencem à
campanha do Mestre. A unicidade será separada entre `key` global e
`campaignId + key` personalizado para permitir o mesmo vocabulário privado em
campanhas distintas.

Os seis tipos padrão preservam as chaves legadas: `GENERIC`, `LEADS_TO`,
`BELONGS_TO`, `CONTAINS`, `BLOCKS` e `UNLOCKS`. Outros padrões úteis podem ser
adicionados de modo idempotente na mesma migration, sem depender de seed em
runtime: `KNOWS`, `SUSPECTS`, `REVEALS`, `DEPENDS_ON`, `CAUSES` e
`CONTRADICTS`.

## Regras de autorização e visibilidade

O serviço exigirá `OWNER` para criar, atualizar, excluir e administrar tipos.
Leituras administrativas exigirão o guard de campanha correspondente. A visão
de jogador será filtrada no backend por `visibility = ALL` e pelos arquivos que
o usuário já pode acessar pelo filtro de publicação/grants; uma relação nunca
deve revelar o nome de arquivo inacessível.

## Migração de dados

1. Criar enums, `RelationshipType`, colunas novas e índices de forma aditiva.
2. Inserir tipos globais com chaves estáveis e conflito idempotente.
3. Preencher `Relationship.campaignId` a partir do arquivo de origem.
4. Associar cada linha existente ao `RelationshipType` global de mesma chave.
5. Aplicar `importance = NORMAL`, `visibility = GM`, descrição vazia e atualizar
   timestamps sem tocar em IDs, origem, destino ou label.
6. Só então tornar `campaignId` e `typeId` obrigatórios e criar os índices de
   campanha e de deduplicação.

O contrato JSON evoluirá para conter `typeKey`, `description`, `importance` e
`visibility`, mantendo leitura de documentos legados que possuam apenas `kind`.
