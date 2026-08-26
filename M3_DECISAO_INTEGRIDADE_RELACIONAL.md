# M3 — Decisão arquitetural de integridade relacional

**Autor:** Manus AI  
**Data:** 25 de agosto de 2026  
**Status da decisão:** **APROVAR integridade estrutural no banco de teste; não aplicar em produção**

## Contexto

O schema atual garante `Relationship.fromId` e `Relationship.toId` individualmente por FKs para `CampaignFile(id)`, além de manter `Relationship.campaignId` por FK para `Campaign(id)`. A camada de serviço também compara as campanhas das duas pontas antes da criação. Contudo, uma escrita direta no PostgreSQL poderia combinar uma campanha com arquivos de outra, porque não existe ainda uma FK composta que inclua o escopo da campanha.

A alternativa estrutural proposta é uma chave candidata em `CampaignFile(campaignId, id)` e duas FKs compostas separadas em `Relationship(campaignId, fromId)` e `Relationship(campaignId, toId)`. `Relationship.typeId` não será incluído nesse desenho: tipos globais usam `RelationshipType.campaignId = NULL`, e a validação de escopo de tipos já permanece no serviço.

## Evidência da auditoria sem escrita

A auditoria foi executada com `RUN_DB_TESTS=1` e `INTEGRATION_TEST_DATABASE=1`, usando a conexão carregada do `.env` local. Ela realizou somente consultas `SELECT`/agregações; não houve escrita, migration, correção, remoção, reatribuição ou limpeza de dados existentes.

| Verificação | Resultado |
|---|---:|
| Grupos duplicados por `Relationship(campaignId, fromId, toId, typeId)` | 0 |
| `fromId` com campanha divergente | 0 |
| `toId` com campanha divergente | 0 |
| Relações com `fromId` inexistente | 0 |
| Relações com `toId` inexistente | 0 |
| Duplicidades da chave candidata `CampaignFile(campaignId, id)` | 0 |
| `RelationshipType` específico fora da campanha | 0 |

Os resultados satisfazem as pré-condições de dados. Se qualquer contagem fosse diferente de zero, o fluxo deveria terminar como `BLOQUEADO — dados incompatíveis`, sem tentar migration.

## Compatibilidade analisada

A chave primária global existente em `CampaignFile(id)` continua necessária para as relações Prisma e para as FKs individuais usadas por cascatas. A nova chave única composta é uma chave candidata adicional, não substitui a chave primária.

As duas FKs compostas apontarão para essa chave candidata e usarão `ON DELETE CASCADE ON UPDATE CASCADE`, alinhadas às FKs atuais de `Relationship.fromId`, `Relationship.toId` e `Relationship.campaignId`. Assim, excluir uma campanha continuará removendo seus relacionamentos por cascata, e a exclusão de um arquivo continuará removendo relações dependentes. Nenhuma relação composta será criada para `typeId`, preservando tipos globais.

O serviço `relationshipService` continua validando as duas pontas e o escopo de `RelationshipType`. A migration adiciona uma garantia para escritas diretas no banco, sem remover a defesa de aplicação. Importação, exportação, visibilidade, Modo Jogador, grafo e rate limiting não precisam de alteração funcional.

## Decisão

A alternativa escolhida é **adicionar integridade estrutural**, porque a auditoria atual não encontrou inconsistências, a mudança é incremental, a chave candidata é compatível com a chave primária global existente e a nova garantia pode ser provada por escritas diretas em teste isolado.

A migration somente poderá ser aplicada depois de revisão do SQL e de uma confirmação explícita de que `DATABASE_URL` aponta exclusivamente para o banco de teste. O rollback manual deve remover primeiro as duas FKs compostas e só depois a chave única candidata. Não será executado como parte normal quando os testes passarem.

## Referências

[1]: ./V18_AUDITORIA_INTEGRIDADE.md "Auditoria V18"
[2]: ./V20_1_AUDITORIA_INTEGRIDADE.md "Auditoria V20.1"
[3]: ./prisma/schema.prisma "Schema Prisma"
[4]: ./scripts/audit-relationship-integrity.mjs "Auditoria relacional somente leitura"
[5]: ./src/services/relationshipService.ts "Serviço de relacionamentos"
