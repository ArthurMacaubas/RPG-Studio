# V18 — RELATÓRIO

## Correções realizadas

A V18 corrige exclusivamente problemas identificados após a auditoria da V17. A importação JSON agora resolve cada `relationship.typeKey` de modo explícito: a chave deve estar declarada em `relationshipTypes` ou pertencer ao vocabulário global suportado. O erro contém o índice de `relationships`, a chave inválida e a indicação de que o tipo não foi encontrado. A validação local rejeita o documento antes da abertura da transação; a importação também repete a validação contra os tipos globais que realmente existem no banco, antes de criar campanha, usuário, arquivo ou relação. O fallback silencioso de tipo desconhecido para `GENERIC` foi removido.

As chaves de tipos personalizados, globais, legados e duplicados foram cobertas. `GENERIC` permanece permitido apenas quando foi pedido de forma explícita ou quando um documento legado omite `typeKey` e traz um `kind` legado válido.

O serviço de relacionamentos passou a converter `P2002` de Prisma para `409 Conflict` tanto ao criar quanto ao atualizar uma relação. A verificação preventiva permanece em funcionamento; a conversão cobre a janela concorrente entre `findFirst()` e a gravação protegida pela constraint única.

O `getGraph()` agora determina os nós ativos primeiro e aplica esse subconjunto às arestas. Assim, arquivos arquivados, enviados à lixeira ou relações que dependem exclusivamente deles não aparecem no grafo do Mestre nem do jogador. `listForPublic()` passou a verificar de novo que os IDs recebidos são públicos, ativos e sem restrição por grant antes de consultar relações `ALL`.

## Problemas encontrados

| Problema | Correção aplicada |
|---|---|
| `typeKey` arbitrário podia passar pela validação e cair em `GENERIC` durante a importação. | Validação de referência de tipo e remoção completa do fallback silencioso. |
| Uma colisão concorrente de unicidade poderia escapar da pré-verificação e retornar erro interno. | Adaptador central de `P2002` para `RelationshipIntegrityError` com status `409`. |
| O grafo do Mestre filtrava lixeira, mas ainda podia incluir arquivos arquivados; arestas eram buscadas antes da seleção final de nós. | Consulta de nós ativos antes das arestas, com os mesmos IDs aplicados nas duas pontas da relação. |
| A consulta pública aceitava os IDs recebidos sem rechecagem central. | Revalidação de publicação, atividade e ausência de restrição por grant. |

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/services/campaignTransferService.ts` | Validação de tipos declarados/globais, revalidação no banco e remoção do fallback para `GENERIC`. |
| `src/services/campaignTransferService.test.ts` | Cobertura para global, personalizado, duplicado, legado, referência ausente e chave inválida. |
| `src/services/relationshipService.ts` | Conversão de `P2002`, filtro de grafo ativo e revalidação de `listForPublic()`. |
| `src/services/relationshipService.test.ts` | Cobertura de P2002, grafo do Mestre e visibilidade pública. |
| `scripts/relationship-constraint-db.ts` | Teste real, isolado e com limpeza da constraint única. |
| `package.json` | Script `test:db:relationship-constraint`. |
| `V18_AUDITORIA_INTEGRIDADE.md` | Registro de integridade global, campanha, legado e teste de banco. |
| `todo.md` | Critérios V18 rastreados. |

## Migrations criadas

Nenhuma migration foi criada ou aplicada na V18. A constraint `@@unique([campaignId, fromId, toId, typeId])` da V17 foi mantida. A proteção contra chaves globais duplicadas já existe como índice parcial único aplicado pela migration V16; recriá-lo nesta versão não acrescentaria segurança e poderia introduzir risco operacional.

## Testes executados

| Verificação | Resultado |
|---|---|
| `npm install` | Concluído. Nenhuma dependência foi alterada. |
| `prisma validate` | Aprovado com URL sintática temporária, sem conexão com banco. |
| `npx tsc --noEmit -p .` | Aprovado. |
| `npx next lint --dir src` | Aprovado sem avisos. |
| `npm test -- --run` | **9 arquivos e 54 testes aprovados**. |
| Segurança de audiência | Coberta para Mestre, P1–P4, jogador sem slot e visibilidade `ALL`. |
| `get`, `getForEntity`, `getGraph`, `listForPlayer`, `listForPublic` | Cobertos por testes de serviço, incluindo duas pontas acessíveis. |
| Importação/exportação | Coberta para tipo global, personalizado, duplicado, legado, inexistente e referência não declarada. |
| Build | `npm run build` aprovado. |
| Auditoria de liberação | Sem `TODO`/`FIXME` produtivo, mock produtivo, rota marcada incompleta ou fallback de mapa de tipo para `GENERIC` no escopo auditado. |

## Testes que não puderam ser executados

O teste real de banco `npm run test:db:relationship-constraint` foi preparado, mas não pôde ser executado neste ambiente. A tentativa segura de `prisma migrate status` falhou antes de conectar com `P1012`, porque o `DATABASE_URL` ativo não é um URL PostgreSQL válido. Não houve migration, reset, `DROP`, exclusão de dados existentes ou escrita de teste no banco.

Para executar o teste em um banco de teste configurado corretamente, use `RUN_DB_TESTS=1 npm run test:db:relationship-constraint`. O script cria uma campanha exclusiva, exige `P2002` na segunda inserção e remove apenas seus próprios dados temporários ao final.

## Problemas ainda existentes

Não há bloqueador funcional conhecido no escopo V18. A URL PostgreSQL configurada neste ambiente precisa ser corrigida antes de qualquer validação que dependa do Neon ou de teste de integração real.

## Riscos conhecidos

| Risco | Tratamento |
|---|---|
| Integridade cruzada `Relationship.campaignId` ↔ `CampaignFile.campaignId` ainda é validada pela aplicação, não por chaves estrangeiras compostas. | Documentada recomendação futura; uma alteração exigiria auditoria e migration estrutural própria, portanto não foi forçada na V18. |
| Índice parcial de unicidade global não é expressável diretamente pelo atributo composto do Prisma. | A proteção já está ativa no PostgreSQL via migration aplicada; mantida sem mudança destrutiva. |
| `npm install` continua relatando 6 vulnerabilidades de alta severidade em dependências. | Não foi executado `npm audit fix` para evitar upgrades não revisados e fora do escopo. |

## Status

**V18 PRONTA**

Aguarde minha próxima instrução.
