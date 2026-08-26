# V20.1 — Auditoria de Integridade de Dados

## Escopo

Foram auditados `schema.prisma`, migrations existentes, `campaignTransferService`, `fileService`, rotas de importação, criação de arquivo e timeline, tipos de transferência e testes atuais. Esta auditoria é somente leitura; nenhum banco foi resetado, nenhuma migration foi criada e nenhum dado existente foi modificado.

## Falhas confirmadas

| Prioridade | Área | Falha | Impacto |
|---|---|---|---|
| CRÍTICO | Importação JSON | `dateOrNow()` converte data ausente ou inválida para `new Date()`. | Documento corrompido é aceito com data fabricada. |
| CRÍTICO | Validação JSON | Datas de arquivo, anexo, comentário, histórico, relação, sessão e timeline são verificadas apenas como string presente ou não são verificadas. | Datas inválidas chegam à transação. |
| ALTO | Referências de importação | Alguns mapeamentos internos usam `if (id)`, `filter(Boolean)` ou `?? null`. | Referência inconsistente pode ser ignorada em vez de interromper a importação. |
| ALTO | API de arquivo | `type` usa `z.string()` seguido de cast para `FileType`; `tagIds` não têm verificação estrutural/semântica na rota. | Cliente pode mandar valor fora do enum e tags de outra campanha. |
| ALTO | API de timeline | Zod aceita qualquer string e a rota cria `new Date()` sem validar o resultado. | `Invalid Date` atravessa a fronteira HTTP. |
| MÉDIO | Identidade | `PRESERVE_WHEN_AVAILABLE` tenta inserir IDs, mas não pré-audita colisão nem expõe resumo de remapeamento/preservação. | Erros de banco tardios e UX pouco clara. |

## Constraints já existentes

| Regra | Estado atual |
|---|---|
| `Relationship(campaignId, fromId, toId, typeId)` única | Constraint Prisma/PostgreSQL declarada no schema e aplicada na V17. |
| `RelationshipType(campaignId, key)` única | Constraint composta declarada. Para `campaignId=NULL`, a unicidade global depende do índice parcial `RelationshipType_global_key_key` aplicado na migration V16. |
| `FileTag(fileId, tagId)` única | Chave primária composta declarada; ela não garante, por si só, que tag e arquivo sejam da mesma campanha. |
| Relação e arquivo pertencem à mesma campanha | Validado por serviços; não existe FK composta entre `Relationship.campaignId` e as duas pontas. |

## Decisão de schema

Não será criada migration V20.1. Uma FK composta para garantir `Relationship.campaignId ↔ CampaignFile.campaignId` exigiria chaves candidatas compostas, alteração de relações Prisma, auditoria de dados e um plano explícito de rollback. Isso fica apenas documentado como recomendação futura de integridade estrutural.

## Direção de correção

A V20.1 criará validadores estritos com mensagens localizáveis por caminho, valor e regra. A validação ocorrerá antes de `prisma.$transaction`; a segunda validação dentro da transação continuará protegendo contra discrepâncias de tipos globais. O dry run utilizará o mesmo validador e não criará campanha. Apenas após validação positiva e confirmação explícita a rota poderá chamar a importação transacional.
