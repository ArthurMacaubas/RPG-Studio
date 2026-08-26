# M2.1 — Separação da exportação administrativa e correção do harness

**Autor:** Manus AI  
**Status:** **APROVADO**  
**Data da execução:** 25 de agosto de 2026  
**Escopo:** exclusivamente M2.1 e a reexecução integral da validação PostgreSQL do Marco 2.  

> O M2.1 separa a exportação HTTP administrativa, que exige OWNER autenticado, da exportação server-side usada pelo harness, que recebe `ownerId` explicitamente e revalida a propriedade no próprio banco.

## Resultado executivo

A falha anterior do round-trip foi corrigida sem alterar `requireUser`, simular cookies, adicionar bypasses ou remover a autorização da rota HTTP. O problema era o uso de `exportCampaign()` pelo script de integração: esse caminho dependia de `cookies()` de Next.js fora de um request scope. O harness passou a usar exclusivamente `exportCampaignAsOwner(campaignId, ownerId)`, eliminando o acoplamento request-scoped.

Após a correção, as validações locais passaram integralmente e a sequência PostgreSQL do M2 foi reexecutada com sucesso em banco de teste isolado. O round-trip concluiu exportação, importação e reexportação, com um arquivo verificado. O Marco 3/V21 não foi iniciado.

## Alteração implementada

O serviço `campaignTransferService.ts` agora possui um loader privado `loadExportSource(campaignId, ownerId)`. A primeira operação é um `prisma.campaign.findFirst` com o filtro conjunto `{ id: campaignId, ownerId }` e com o include administrativo existente. Somente quando essa campanha é encontrada o serviço busca `relationships` e `relationshipTypes` da campanha. Dessa forma, um `ownerId` divergente encerra a operação antes de qualquer documento, relacionamento ou dado parcial ser montado.

A superfície `exportCampaign(campaignId)` continua sendo a utilizada pela rota HTTP. Ela chama `assertCampaignRole(campaignId, 'OWNER')`, obtém o `access.user.id` autenticado e passa esse identificador ao loader owner-aware. Portanto, um PLAYER é rejeitado pelo guard antes da leitura administrativa, e uma sessão ausente permanece sujeita ao contrato HTTP público de autenticação.

A nova superfície `exportCampaignAsOwner(campaignId, ownerId)` é destinada exclusivamente a chamadas server-side controladas, como o harness de round-trip. Ela não chama `requireUser()` nem `cookies()`. A propriedade é revalidada diretamente na consulta de campanha; quando não há correspondência, o serviço lança apenas um erro neutro de campanha não encontrada, sem documento e sem consultas posteriores de relacionamentos.

A montagem do documento foi extraída para um builder comum, preservando os campos existentes, inclusive `BoardEdge.curve`. `importCampaign` não foi alterada.

## Alteração do harness

O script `scripts/roundtrip-db.ts` importa `exportCampaignAsOwner` e utiliza o mesmo `ownerId` temporário tanto para exportar a campanha original quanto para reexportar a campanha importada. Os guardas `RUN_DB_TESTS=1` e a limpeza transacional/por `finally` foram mantidos. Nenhuma limpeza global, migration, reset, seed não aprovado ou consulta manual foi executada.

## Testes locais

A bateria local foi executada com uma `DATABASE_URL` sintática apontando para localhost, sem conexão ao banco PostgreSQL de teste. Os resultados foram os seguintes:

| Verificação | Resultado |
|---|---:|
| `prisma generate` | **APROVADO** — Prisma Client 5.22.0 gerado |
| `prisma format --check` | **APROVADO** |
| `prisma validate` | **APROVADO** |
| TypeScript strict (`tsc --noEmit`) | **APROVADO** |
| Lint | **APROVADO** |
| Suíte completa | **APROVADO** — 21 suítes, 153 testes |
| Build de produção | **APROVADO** |
| Regressões focadas M2.1 | **APROVADO** — 3 arquivos, 8 testes |

As regressões focadas cobrem a exigência OWNER da superfície HTTP, a rejeição de acesso PLAYER, a ausência de sessão, a propagação do `ownerId` autenticado, a rejeição de proprietário divergente e a preservação de `BoardEdge.curve`.

## Revalidação PostgreSQL do M2

A URL foi carregada somente do arquivo `.env` local e não foi reproduzida neste relatório. O arquivo está excluído por `.gitignore`. A execução usou `RUN_DB_TESTS=1` e `INTEGRATION_TEST_DATABASE=1`, com parada na primeira falha. Todas as etapas concluíram com sucesso.

| Etapa | Resultado | Evidência não sensível |
|---|---:|---|
| Smoke de leitura | **APROVADO** | `ok: true`; 2 campanhas e 10 arquivos observados |
| Constraint de relacionamento | **APROVADO** | `ok: true`; duplicidade acionou a constraint esperada |
| Integridade, unicidade e rollback | **APROVADO** | `ok: true`; unicidades verificadas e `rollback: true` |
| Round-trip export/import/export | **APROVADO** | `ok: true`; 1 arquivo verificado após reexportação |

O round-trip não apresentou mais o erro de `cookies` fora de request scope. A execução foi encerrada normalmente após a limpeza dos dados temporários prevista no próprio script. Nenhum identificador de campanha, usuário, arquivo, host, account id, senha ou URL foi incorporado ao relatório.

## Integridade do escopo e segurança

Não houve alteração de schema, migrations, relações, `publicationPolicy`, Modo Jogador, rate limiting, storage, dependências ou lockfile. Também não houve alteração de `requireUser` ou `importCampaign`, criação de flags mágicas, bypass baseado em ambiente, cookies falsos ou exposição de `error.message` pela API.

A rota HTTP continua administrativa e OWNER-only. As respostas de erro permanecem sob `apiErrorResponse`, com mensagens e códigos públicos estáveis; os testes confirmam que 403 e 401 não entregam documento nem detalhes internos.

## Conclusão

O M2.1 está **APROVADO**. A separação de superfícies removeu a dependência indevida de request scope do harness e adicionou a revalidação server-side de propriedade por `Campaign.id` e `Campaign.ownerId`. A validação local completa e a validação PostgreSQL integral do M2 passaram. O Marco 3/V21 permanece fora de escopo e não foi iniciado.

## Referências

[1]: ./src/services/campaignTransferService.ts "Serviço de transferência de campanhas"
[2]: ./scripts/roundtrip-db.ts "Harness de round-trip PostgreSQL"
[3]: ./src/app/api/campaigns/%5Bid%5D/export/route.ts "Rota HTTP administrativa de exportação"
[4]: ./src/lib/access.ts "Guards de acesso por campanha"
[5]: ./M2_VALIDACAO_POSTGRESQL_RELATORIO.md "Relatório histórico e atualizado da validação PostgreSQL do M2"
