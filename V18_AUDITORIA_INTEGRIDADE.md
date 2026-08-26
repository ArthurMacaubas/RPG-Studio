# V18 — Auditoria de Integridade de Relacionamentos

## Escopo

Esta auditoria registra somente as correções de integridade solicitadas após a V17. Nenhum recurso novo, redesign ou alteração em Quadro, combate, sessões, sistemas de RPG ou autenticação foi incluído.

## Tipos globais

A migration `20260821192014_relationship_core_extensible` já criou o índice parcial único `RelationshipType_global_key_key` em `RelationshipType(key) WHERE campaignId IS NULL`. Portanto, duas chaves globais iguais não podem coexistir no PostgreSQL, inclusive apesar de `campaignId` aceitar `NULL` no índice composto descrito pelo Prisma.

Não foi criada nova migration para esse ponto. Recriar ou substituir o índice aplicado aumentaria o risco sem ampliar a garantia existente.

## Integridade entre campanhas

O serviço verifica que `fromId` e `toId` pertencem à mesma campanha antes de criar um relacionamento. A migration do Core V16 também recusou estado legado entre campanhas antes de preencher `Relationship.campaignId`.

Uma garantia adicional diretamente no banco exigiria uma evolução estrutural: uma chave única candidata em `CampaignFile(campaignId, id)` e duas chaves estrangeiras compostas de `Relationship(campaignId, fromId)` e `Relationship(campaignId, toId)`. Como isso altera relações Prisma e exige uma migration cuidadosamente revisada em dados já existentes, a V18 não a aplica. A recomendação fica documentada para uma versão futura dedicada a integridade relacional, precedida de auditoria de dados e plano de rollback.

## Campo legado `kind`

O campo `Relationship.kind` permanece apenas para compatibilidade. A criação e a atualização resolvem o tipo fonte de verdade por `typeId` ou `RelationshipType`; em seguida gravam `kind` somente como espelho dos seis tipos legados. Na importação, `kind` só é aceito quando `typeKey` está ausente em um documento legado. Os usos restantes em API, renderizadores de exportação e diagnóstico são contratos ou apresentação compatíveis, não regras novas de negócio.

## Garantias preservadas

As audiências V17 permanecem centralizadas: Mestre visualiza tudo; jogador autenticado visualiza `ALL` e seu único slot `P1`–`P4`; links públicos visualizam somente `ALL`. Para jogadores, as duas pontas da relação continuam exigindo publicação, atividade e grant quando aplicável.

## Mudanças V18 confirmadas

| Tema | Resultado |
|---|---|
| JSON | `typeKey` inexistente falha com índice, chave e mensagem de tipo não encontrado; não há fallback para `GENERIC`. |
| Tipos | Referências devem existir em `relationshipTypes` ou no vocabulário global suportado; na importação são revalidadas contra os tipos globais realmente disponíveis. |
| Concorrência | Erros Prisma `P2002` na criação ou atualização são convertidos em conflito `409`. |
| Grafo | O grafo consulta primeiro os nós ativos e filtra as arestas pelo conjunto resultante; arquivos arquivados, na lixeira e relações dependentes deles não entram no resultado. |

## Teste de constraint no banco

Foi criado o comando `npm run test:db:relationship-constraint`, que cria uma campanha temporária, tenta inserir duas vezes a mesma relação e exige o código Prisma `P2002`; no encerramento, apaga somente a campanha temporária e o usuário temporário criado pelo próprio script.

O teste não pôde ser executado neste ambiente porque o `DATABASE_URL` ativo não é um URL PostgreSQL válido para o Prisma (`P1012`, protocolo ausente ou inválido). Nenhuma migration, dado de campanha ou dado de usuário foi alterado nesta tentativa. O teste deve ser executado em um banco de teste com `DATABASE_URL` PostgreSQL válido e `RUN_DB_TESTS=1`.
