# M3/M3.1 — Integridade relacional estrutural e robustez do harness

**Autor:** Manus AI  
**Data:** 25 de agosto de 2026  
**Status final:** **APROVADO**  
**Ambiente de aplicação:** exclusivamente o PostgreSQL de teste confirmado pelo usuário.  

> O M3.1 corrigiu somente a asserção e o diagnóstico do harness cross-campaign. A migration estrutural já aplicada não foi alterada, nenhuma nova migration foi criada e a revalidação integral do M3 passou no PostgreSQL de teste.

## 1. Escopo e resultado executivo

O M3 adicionou uma garantia estrutural para impedir que `Relationship.campaignId` fosse combinado com `fromId` ou `toId` de outra campanha. A mudança usa uma chave candidata em `CampaignFile(campaignId, id)` e duas FKs compostas, uma para cada ponta da relação.

O M3.1 corrigiu exclusivamente o script `scripts/relationship-cross-campaign-db.ts`. O harness deixou de exigir igualdade rígida de metadados de constraint e passou a validar a semântica da operação e o código Prisma esperado. O alvo ou nome da constraint é aceito apenas como diagnóstico opcional, sanitizado e não é critério único de aprovação.

A primeira execução do M3 havia falhado porque a verificação de `P2002` dependia de uma representação instável do metadado retornado pelo Prisma. Essa falha foi corrigida no M3.1 sem alteração de schema, migration, serviços ou dados existentes.

## 2. Verificação do estado antes da revalidação

A nova conexão foi carregada exclusivamente do `.env` local e não foi reproduzida em código, logs ou documentação. `prisma migrate status` confirmou que as migrations locais estavam aplicadas e que o schema do banco de teste estava atualizado.

A auditoria `scripts/audit-relationship-integrity.mjs` foi repetida antes dos testes de escrita. Ela executou somente consultas de leitura e agregações e encontrou zero ocorrências em todas as categorias:

| Verificação | Resultado |
|---|---:|
| Grupos duplicados por `Relationship(campaignId, fromId, toId, typeId)` | 0 |
| `fromId` com campanha divergente | 0 |
| `toId` com campanha divergente | 0 |
| Relações com `fromId` inexistente | 0 |
| Relações com `toId` inexistente | 0 |
| Duplicidades em `CampaignFile(campaignId, id)` | 0 |
| `RelationshipType` específico fora da campanha | 0 |

A auditoria não encontrou a condição de bloqueio `BLOQUEADO — dados incompatíveis`.

## 3. Migration preservada

A migration `20260825050000_relationship_campaign_scope` permaneceu byte a byte idêntica à versão do M3 anterior. A comparação com o pacote M3 anterior confirmou que `prisma/schema.prisma` e o SQL da migration não foram modificados durante o M3.1.

A migration já aplicada:

1. mantém a PK global `CampaignFile(id)`;
2. cria a chave candidata única `CampaignFile(campaignId, id)`;
3. substitui as FKs simples das pontas por `Relationship_from_campaign_file_scope_fkey` e `Relationship_to_campaign_file_scope_fkey`;
4. preserva `ON DELETE CASCADE ON UPDATE CASCADE`;
5. mantém a FK simples de `Relationship.typeId`, necessária para tipos globais;
6. não altera `relationshipService`, `publicationPolicy`, exportação/importação ou regras de domínio.

Nenhuma nova migration foi criada no M3.1, nenhum rollback foi executado e nenhum dado existente foi saneado ou alterado manualmente.

## 4. Correção do harness M3.1

O script agora identifica o código Prisma por uma leitura tolerante de objetos compatíveis com erros conhecidos e aplica a seguinte matriz semântica:

| Caso lógico | Operação | Código exigido | Critério adicional |
|---|---|---|---|
| Relação válida | Inserção na mesma campanha | Sem erro | A relação criada permanece presente durante o teste. |
| `fromId` cross-campaign | Inserção com origem de outra campanha | `P2003` | Se `meta.field_name` existir, não pode apontar para a FK da operação `to`. |
| `toId` cross-campaign | Inserção com destino de outra campanha | `P2003` | Se `meta.field_name` existir, não pode apontar para a FK da operação `from`. |
| Relação válida duplicada | Segunda inserção da mesma relação | `P2002` | O caso lógico já é conhecido e o alvo não é usado como critério único. |

Mensagens de falha incluem somente o caso lógico, o código recebido e metadados opcionais reduzidos a `field_name`, `target` ou `constraint`, com caracteres limitados e tamanho máximo. O harness não registra URL, credencial, IDs, títulos, conteúdo ou dados de campanha. Erros sem o código esperado continuam falhando o script.

A limpeza permanece restrita ao usuário, campanhas e registros dependentes criados pelo próprio harness dentro do `finally`.

## 5. Validação local

A sequência local foi executada após a correção do harness e passou integralmente:

| Verificação | Resultado |
|---|---:|
| `prisma generate` | **APROVADO** — Prisma Client 5.22.0 |
| `prisma format --check` | **APROVADO** |
| `prisma validate` | **APROVADO** |
| `tsc --noEmit -p .` | **APROVADO** |
| `next lint --dir src` | **APROVADO**, sem warnings ou erros |
| Testes | **APROVADO** — 21 suítes, 153 testes |
| Build | **APROVADO**, com warning preexistente de autoprefixer em CSS |

Uma primeira tentativa de invocação do lint usando o wrapper do package manager passou o separador de argumentos em duplicidade e foi rejeitada pelo Next.js antes da execução do lint. A validação foi refeita com o comando equivalente `next lint --dir src`, que passou sem warnings ou erros. Isso não representou falha de código ou de schema.

## 6. Revalidação integral PostgreSQL

Após confirmação de que o banco era exclusivamente de teste, os scripts foram executados na ordem exigida. Todos passaram e o fluxo não fez reset, drop, seed não aprovado ou limpeza global.

| Etapa | Resultado não sensível |
|---|---|
| `db:smoke` | **APROVADO** — 2 campanhas e 3 arquivos observados |
| `test:db:relationship-constraint` | **APROVADO** — unicidade de Relationship comprovada por `P2002` |
| `test:db:integrity` | **APROVADO** — unicidade global, unicidade de Relationship e rollback transacional |
| `test:db:roundtrip` | **APROVADO** — exportação/importação e remapeamento concluídos |
| `test:db:relationship-cross-campaign` | **APROVADO** — relação válida, `fromId` cross-campaign, `toId` cross-campaign e duplicidade validados |

O teste cross-campaign opera diretamente pelo Prisma e não usa `relationshipService` para provar as FKs compostas. A saída final confirmou `validSameCampaign`, `fromCrossCampaign`, `toCrossCampaign` e `duplicate` como verdadeiros, além da limpeza restrita a fixtures temporárias.

## 7. Segurança e escopo

A migration foi aplicada somente no PostgreSQL de teste. O `.env` permanece local e não faz parte de relatórios ou entregáveis públicos. Não foram alterados dependências, lockfile, serviços de domínio, exportação/importação, Modo Jogador, UI, rate limiting ou storage no M3.1.

Não foram usados `migrate reset`, `DROP DATABASE`, `DROP SCHEMA`, rollback manual, bypass, flags mágicas de ambiente, cookies falsos ou saneamento global. Nenhuma funcionalidade de Hipóteses e Evidências, Marco 4 ou outra evolução posterior foi iniciada nesta tarefa.

## 8. Rollback

O rollback da migration não foi executado. Caso seja necessário em uma etapa futura, deverá ser revisado e autorizado separadamente no ambiente correto, removendo primeiro as FKs compostas, depois a chave candidata e finalmente restaurando as FKs simples anteriores. A execução atual não realizou nenhuma reversão.

## 9. Conclusão

O M3/M3.1 está **APROVADO** para o escopo executado. O M3 possui migration estrutural aplicada no banco de teste e a revalidação direta passou. O M3.1 corrigiu apenas a dependência rígida do harness em metadados de erro Prisma. Após esta entrega, a execução deve parar conforme o prompt; não foram iniciados Hipóteses e Evidências, Quadros, Modo Jogador ou Marco 4.

## Referências

[1]: ./M3_DECISAO_INTEGRIDADE_RELACIONAL.md "Decisão arquitetural M3"
[2]: ./scripts/audit-relationship-integrity.mjs "Auditoria relacional somente leitura"
[3]: ./prisma/schema.prisma "Schema Prisma"
[4]: ./prisma/migrations/20260825050000_relationship_campaign_scope/migration.sql "Migration M3"
[5]: ./scripts/relationship-cross-campaign-db.ts "Teste direto cross-campaign M3.1"
[6]: ./src/services/relationshipService.ts "Serviço de relacionamentos"
[7]: ./M2_VALIDACAO_POSTGRESQL_RELATORIO.md "Validação PostgreSQL M2/M2.1"
