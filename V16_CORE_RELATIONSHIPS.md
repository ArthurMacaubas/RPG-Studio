# V16 — Core investigativo de relacionamentos

## Escopo entregue

O prompt anexado, originalmente destinado à V6, foi incorporado como uma
evolução incremental da V15. A implementação preserva o modelo polimórfico de
`CampaignFile`, o Quadro, o Compilador, a transferência JSON e os guards já
existentes. Nenhuma funcionalidade futura de revelações, dependências ou
hipóteses foi criada nesta versão.

| Área | Resultado |
|---|---|
| Fonte de verdade | `Relationship` segue como o único registro oficial de conexão entre arquivos. `BoardEdge` permanece uma relação visual distinta. |
| Tipos extensíveis | `RelationshipType` suporta vocabulário global e personalizado por campanha, sem exigir nova alteração de schema para cada tipo. |
| Dados existentes | IDs, `fromId`, `toId`, `kind` legado, labels e timestamps existentes foram preservados. `campaignId` e `typeId` foram preenchidos antes das novas restrições obrigatórias. |
| Metadados | Relações possuem descrição, importância, visibilidade e data de atualização. A direção continua definida por origem e destino. |
| API e serviço | `relationshipService` centraliza criação, edição, exclusão, tipos, consultas por entidade e grafo oficial. Rotas apenas validam e delegam. |
| Interface | `RelationshipManager` substitui o formulário fechado do editor, com busca de destino, tipos, tipo personalizado, rótulo, descrição, importância, visibilidade, edição, remoção e separação incoming/outgoing. |
| Jogador | O backend devolve somente relações `ALL` cujas duas pontas já passaram pelo filtro de publicação/grant. A interface é exclusivamente de leitura. |
| JSON e Compilador | Exportação/importação preservam os campos novos e aceitam backups legados. O Compilador agora usa o nome do tipo extensível como label da aresta oficial. |

## Migration aplicada

A migration `20260821192014_relationship_core_extensible` foi aplicada ao
Neon após `prisma validate` e `prisma migrate status` confirmarem a base. Ela
cria `RelationshipType`, os enums de importância e visibilidade, colunas
aditivas em `Relationship`, tipos globais idempotentes e índices. Antes do
backfill, uma verificação interrompe a operação se houver relação entre
campanhas diferentes, evitando associação incorreta de registros legados.

Os tipos padrão preservados são `GENERIC`, `LEADS_TO`, `BELONGS_TO`,
`CONTAINS`, `BLOCKS` e `UNLOCKS`. Também foram disponibilizados `KNOWS`,
`SUSPECTS`, `REVEALS`, `DEPENDS_ON`, `CAUSES` e `CONTRADICTS` para novas
relações. O campo enum `kind` foi mantido somente como espelho transitório para
leitura e importação de backups antigos; novos fluxos usam `typeId`.

## Limites deliberados

`GM` e `ALL` são os únicos níveis de visibilidade nesta versão. Uma lista de
strings como `P1`/`P2` não foi introduzida porque não corresponde a identidades
reais; uma futura visibilidade individual deve usar `CampaignMember` e o modelo
de grants existente. O Quadro ainda não diferencia hipóteses de relações
oficiais visualmente; a separação de dados já foi preservada e essa experiência
fica para uma etapa posterior autorizada.
