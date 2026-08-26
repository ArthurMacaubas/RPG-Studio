# Auditoria de compatibilidade — Core investigativo de relacionamentos

## Contexto

O prompt anexado foi escrito para uma antiga V6, mas o projeto atual já está na
V15. Esta auditoria não renomeia nem recria versões anteriores; ela identifica
como executar a evolução proposta como uma próxima fatia incremental.

## Estado encontrado

| Área | Estado atual | Risco ou decisão de compatibilidade |
|---|---|---|
| Persistência | `Relationship` guarda `fromId`, `toId`, enum `kind`, `label` e `createdAt`. A campanha é implícita pelo arquivo de origem. | Acrescentar `campaignId`, descrição, importância, visibilidade, `updatedAt` e tipo extensível sem alterar IDs, origem ou destino. |
| Tipos | `RelationshipKind` é um enum fechado com seis valores. | Introduzir `RelationshipType` global ou de campanha e migrar os seis valores para tipos padrão. O enum legado deve ser mantido somente como compatibilidade transitória, não como fonte de verdade nova. |
| Serviço | Há `create`, `update` e `remove`; criação valida par, campanha e permissão de escrita. | `update` e `remove` precisam recuperar a campanha e aplicar o guard antes da mutação. Faltam `get`, `list`, `getForEntity` e `getGraph`. |
| API | Há `POST /api/relationships` e `PATCH`/`DELETE /api/relationships/[id]`, todos com payload fechado. | Evoluir o contrato preservando `kind` como alias de importação durante a transição e adicionando `typeId`, descrição, importância e visibilidade. |
| Editor | O formulário é embutido na página de arquivo, tem busca de destino e lista incoming/outgoing. | Extrair um `RelationshipManager` reutilizável, mantendo busca de entidades e navegação para os dois lados. |
| Compilador | Consome relações oficiais direcionais e usa `kind` como rótulo do grafo. | Manter `fromId`/`toId` e fornecer `type.key` ou `type.name` como label, sem misturar `BoardEdge`. |
| Quadro | `BoardEdge` é uma estrutura visual separada. | Não unificar registros. Relação oficial continuará distinta de hipótese visual; a classificação explícita de hipótese permanece uma próxima etapa. |
| JSON | Transferência serializa e recria apenas `fromId`, `toId`, `kind`, `label` e data. | Atualizar validação, exportação e importação para preservar os metadados novos e aceitar documentos legados. |
| Busca | Pesquisa labels e nomes de arquivos relacionados. | Preservar essas buscas e incluir descrição/tipo sem modificar os resultados existentes. |

## Estratégia de migration segura

A evolução deve ser feita em uma migration aditiva. Ela criará tipos padrão
globais, adicionará os novos campos e preencherá `campaignId` pelo arquivo de
origem. Depois, cada relacionamento existente será associado ao tipo padrão
equivalente ao seu `kind` legado. Nenhum `Relationship.id`, `fromId`, `toId` ou
registro de arquivo será removido.

Os novos relacionamentos usarão `RelationshipType` como fonte de verdade. O
campo enum legado poderá continuar no banco durante uma janela de compatibilidade
para permitir leitura de exportações e consumidores antigos, mas a aplicação não
deve criar novas regras a partir dele. A remoção física desse campo só deve
ocorrer numa versão posterior, após a atualização completa dos consumidores.

## Pré-requisitos para implementação

Antes de gerar a migration, a rodada deverá repetir `prisma validate` e
`prisma migrate status` com uma `DATABASE_URL` PostgreSQL atualizada. A V15 já
confirmou e aplicou a migration de combate, mas o acesso deve ser confirmado no
momento da próxima alteração de schema.
