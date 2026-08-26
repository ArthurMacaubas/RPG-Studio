# V20.1 — Integridade de Dados e Testes de Integração

## Resultado técnico

A V20.1 endurece a entrada de dados de campanha sem migration, reset ou exclusão de dados existentes. A etapa corrige normalizações silenciosas, centraliza erros localizáveis para JSON e adiciona uma estratégia segura de integração PostgreSQL. A arquitetura de serviços, APIs, Prisma, CSS Modules e tokens V19 foi preservada.

## Datas e erros localizáveis

`dateOrNow()` foi removido. A transferência agora exige ISO UTC com milissegundos e rejeita datas ausentes ou inválidas quando o campo do formato é obrigatório. Nenhuma data inválida é convertida para `new Date()` atual.

`CampaignTransferValidation` agora fornece `issues`, além de `errors`. Cada issue contém `path`, `value`, `rule` e `message`. A cobertura inclui `exportedAt`, arquivos, anexos, comentários, histórico, relacionamentos, sessões e timeline.

| Exemplo | Regra retornada |
|---|---|
| `files[0].attachments[0].createdAt` | `date.iso_utc_milliseconds` |
| `relationships[0].fromId` | `reference.file.exists` |
| `relationships[0].typeKey` | `reference.relationshipType.exists` |
| `files[0].data.classId` | `reference.customSystem.classes` |
| `playerMode.visibility[0].fileId` | `reference.file.exists` |

## Referências e integridade de campanha

O validador agora bloqueia, antes de abrir `prisma.$transaction`, IDs duplicados e referências inexistentes em tags, relações, favoritos, sessões, timeline, quadro, visibilidade do Modo Jogador e sistema personalizado. O sistema personalizado valida atributos ligados a skills, referências escalares `classId`, `raceId`, `attributeId`, `skillId` e mapas `attributes`/`skills` no JSON de arquivo. O remapeamento interno deixou de preservar IDs inválidos silenciosamente; uma referência sem mapa lança erro, embora a validação de documento deva sempre impedi-la antes disso.

`fileService.create()` agora consulta as tags dentro da mesma transação usada para criar o arquivo. Ele recusa IDs duplicados, IDs inexistentes e tags que pertençam a outra campanha com `422`; a criação do arquivo não ocorre nesse caso.

## Importação e dry run

As rotas de importação não aceitam mais documento bruto sem contrato. A validação recebe `{ document, identityMode }`; a criação recebe `{ document, identityMode, confirm: true }` e usa Zod. Sem dry run concluído e confirmação explícita, a rota responde `422`.

A função `dryRunCampaignImport()` não escreve no banco. Ela retorna a validação, o modo de identidade e um plano hierárquico com campanha, arquivos, tags, tipos, relações e itens de sistema personalizado. A tela de importação apresenta esse plano, permite escolher **Remapear todos os IDs** ou **Preservar IDs quando disponíveis**, refaz o dry run ao trocar de modo, apresenta caminho e regra de cada erro e bloqueia a confirmação enquanto houver invalidez ou revalidação pendente.

No modo `PRESERVE_WHEN_AVAILABLE`, cada entidade com ID exportado é preservada se o ID estiver livre na tabela correspondente. Colisões são remapeadas dentro da própria transação, e os mapas de referências atualizam o restante da importação. O modo `REMAP` continua criando IDs novos para a campanha restaurada.

## APIs endurecidas

| Rota | Correção |
|---|---|
| `POST /api/campaigns/import/validate` | Zod, dry run e plano de identidade. |
| `POST /api/campaigns/import` | Zod e `confirm: true` obrigatório. |
| `POST /api/campaigns/[id]/files` | `FileType` como enum Zod e `tagIds` não vazios. |
| `GET /api/campaigns/[id]/files` | Query params validados com Zod, sem casts TypeScript. |
| `POST /api/campaigns/[id]/timeline` | `happenedAt` ISO validado antes de `new Date()`. |
| `PATCH /api/timeline/[id]` | Mesma validação estrita de data para edição. |

## Constraints PostgreSQL e estratégia de integração

Não foi criada migration. A V20.1 confirmou as constraints existentes no schema: unicidade de `Relationship(campaignId, fromId, toId, typeId)`, unicidade composta de `RelationshipType(campaignId, key)` e o índice parcial de tipos globais aplicado anteriormente para chaves com `campaignId=NULL`.

Foi criado `npm run test:db:integrity`. O script exige **as duas confirmações explícitas** `RUN_DB_TESTS=1` e `INTEGRATION_TEST_DATABASE=1`, cria apenas usuário/campanha/tipos identificados por sufixo temporário, testa a duplicação de relacionamento, a unicidade global de tipo e o rollback de uma transação com erro `P2002`. Ao terminar, remove exclusivamente os próprios dados temporários.

[URL/credencial de banco redigida neste histórico]

A recomendação de FK composta entre `Relationship.campaignId` e `CampaignFile.campaignId` continua apenas documentada. Aplicá-la requer migration estrutural, auditoria de dados, compatibilidade de relações Prisma e plano de rollback; ela não foi improvisada nesta etapa.

## Validação executada

| Verificação | Resultado |
|---|---|
| `npm install` | Concluído; dependências não foram alteradas. |
| `prisma format` | Concluído. |
| `prisma validate` | Schema válido com URL sintática temporária; sem conexão com banco. |
| `npx tsc --noEmit -p .` | Aprovado. |
| `npx next lint --dir src` | Aprovado sem warnings. |
| `npm test -- --run` | **12 arquivos e 86 testes aprovados**. |
| `npm run build` | Aprovado. |
| `INTEGRATION_TEST_DATABASE=1 npm run test:db:integrity` | Bloqueado por `P1012`; não executou escrita. |

O `npm install` mantém o alerta pré-existente de 6 vulnerabilidades de alta severidade. Não foi aplicado `npm audit fix`, pois isso faria upgrades não revisados fora do escopo.

## Status

**V20.1 PRONTA**

Aguardo a próxima instrução antes de iniciar outra versão.
