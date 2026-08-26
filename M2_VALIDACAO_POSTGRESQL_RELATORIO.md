# M2 — Validação PostgreSQL isolada

**Autor:** Manus AI  
**Status final:** **APROVADO**  
**Data da revalidação:** 25 de agosto de 2026  
**Escopo:** smoke de leitura, constraints, rollback e round-trip de exportação/importação.  
**Banco:** PostgreSQL isolado de teste, conforme confirmação do usuário.  

> A primeira execução do M2 foi interrompida porque o harness chamava a exportação request-scoped fora de uma requisição Next.js. O M2.1 corrigiu esse acoplamento antes desta revalidação; esta versão registra os resultados finais.

## Ambiente e segurança

A credencial foi carregada exclusivamente do arquivo `.env` local durante a execução e não é reproduzida neste documento. O arquivo `.env` está excluído por `.gitignore`. Host, URL, senha, account id, identificadores de campanhas/usuários/arquivos e quaisquer dados reais foram omitidos.

A execução utilizou `RUN_DB_TESTS=1` e `INTEGRATION_TEST_DATABASE=1`, com dados temporários criados pelos próprios scripts e limpeza em `finally`. Não foram executadas migrations, `prisma migrate reset`, `DROP DATABASE`, `DROP SCHEMA`, seeds não aprovados, limpeza global ou consultas manuais destrutivas.

## Alteração M2.1 que habilitou o round-trip

A exportação HTTP administrativa permanece em `exportCampaign(campaignId)`, que chama `assertCampaignRole(campaignId, 'OWNER')`, usa o `user.id` autenticado e só então carrega a fonte administrativa.

O harness usa `exportCampaignAsOwner(campaignId, ownerId)`. Essa superfície server-side carrega a campanha por filtro conjunto `Campaign.id` e `Campaign.ownerId` no próprio banco. Apenas após uma correspondência válida busca relacionamentos e tipos de relacionamento. Em caso de divergência, não há documento nem dados parciais.

O serviço não alterou `requireUser` nem `importCampaign`. O round-trip preserva a limpeza existente e não usa cookies simulados, flags mágicas ou bypasses de ambiente.

## Resultados executados em sequência

### 1. Smoke de leitura

**Comando lógico:** `pnpm db:smoke`, com a variável de conexão carregada do `.env`.  
**Resultado:** **APROVADO**.

```json
{
  "ok": true,
  "campaigns": 2,
  "files": 10
}
```

A etapa comprovou conexão, `SELECT 1` e contagens simples sem escrita própria do smoke.

### 2. Constraint de relacionamento

**Comando lógico:** `RUN_DB_TESTS=1 pnpm test:db:relationship-constraint`.  
**Resultado:** **APROVADO**.

```json
{
  "ok": true,
  "constraint": "Relationship_campaignId_fromId_toId_typeId_key"
}
```

A segunda criação da mesma relação acionou `P2002`, conforme esperado. O script mantém limpeza do usuário e da campanha temporários no bloco `finally`.

### 3. Integridade, unicidade e rollback

**Comando lógico:** `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm test:db:integrity`.  
**Resultado:** **APROVADO**.

```json
{
  "ok": true,
  "constraints": [
    "RelationshipType_global_key_key",
    "Relationship_campaignId_fromId_toId_typeId_key"
  ],
  "rollback": true
}
```

A etapa comprovou a unicidade global de `RelationshipType`, a unicidade composta de `Relationship` e o rollback da transação que tentava inserir uma relação duplicada. A campanha criada dentro da transação não sobreviveu à falha. O script remove os dados temporários criados por ele no `finally`.

### 4. Round-trip de exportação/importação

**Comando lógico:** `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm test:db:roundtrip`.  
**Resultado:** **APROVADO**.

```json
{
  "ok": true,
  "files": 1
}
```

A etapa criou os dados temporários, exportou a campanha original com `exportCampaignAsOwner`, importou-a com `importCampaign`, reexportou a campanha importada com o mesmo owner temporário e verificou o arquivo e o remapeamento de dados previstos pelo harness. Não ocorreu novamente o erro `cookies was called outside a request scope`.

## Matriz final

| Verificação | Resultado | Evidência |
|---|---:|---|
| Banco de teste isolado | **APROVADO** | Confirmação do usuário; credenciais omitidas |
| Smoke PostgreSQL | **APROVADO** | `ok: true`; 2 campanhas e 10 arquivos |
| Constraint de relacionamento | **APROVADO** | `P2002` na relação duplicada |
| Integridade e rollback | **APROVADO** | Constraints verificadas e `rollback: true` |
| Round-trip | **APROVADO** | Exportação/importação/reexportação; 1 arquivo verificado |
| Limpeza/rollback | **APROVADO** | Rollback comprovado e limpeza prevista em `finally` |
| Schema/migrations | **Intocados** | Nenhum comando de migration executado |

## Conclusão

O Marco 2 está **APROVADO** após a correção M2.1. O smoke, as constraints, a integridade/rollback e o round-trip passaram no PostgreSQL de teste isolado. A exportação HTTP continua OWNER-only, enquanto o harness utiliza uma superfície server-side owner-aware com revalidação no banco.

O Marco 3/V21 não foi iniciado. Não houve alteração de schema, migrations, relações, `publicationPolicy`, Modo Jogador, rate limiting, storage, visual, dependências ou lockfile.

## Referências

[1]: ./M2_1_EXPORT_HARNESS_RELATORIO.md "Relatório M2.1"
[2]: ./scripts/db-smoke.ts "Smoke PostgreSQL"
[3]: ./scripts/relationship-constraint-db.ts "Validação de constraint de relacionamento"
[4]: ./scripts/integrity-constraints-db.ts "Validação de integridade e rollback"
[5]: ./scripts/roundtrip-db.ts "Harness de round-trip"
[6]: ./src/services/campaignTransferService.ts "Serviço de transferência e exportação"
