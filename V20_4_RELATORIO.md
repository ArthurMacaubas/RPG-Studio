# RPG Campaign Studio — V20.4

## Fechamento documental do Marco 1

**Marco:** M1 — blindagem do contrato público de erros HTTP e fechamento de tipagem do teste Prisma.  
**Base:** pacote da V20.4.1 em `/home/ubuntu/rpg-recovery/rpg-campaign-studio`.  
**Status documental:** **FECHADO**.  
**Próxima etapa:** Marco 2 — validação PostgreSQL isolada; não iniciado nesta entrega.

## Escopo

Esta versão endureceu a fronteira de erros HTTP e fechou a falha de TypeScript existente no teste do Prisma. O trabalho não foi uma reescrita e não alterou a arquitetura de persistência, autorização, publicação, Modo Jogador, storage, rate limiting ou serviços de domínio.

## Diagnóstico

Antes do M1, `src/lib/apiErrors.ts` devolvia `typedError.message` para qualquer exceção que apresentasse uma propriedade `status`. Uma mensagem interna lançada por um guard ou serviço poderia, portanto, chegar diretamente ao cliente. Esse comportamento permitia expor nomes, IDs, contexto de permissão ou detalhes privados por meio de uma resposta HTTP aparentemente controlada.

A V20.4 também encontrou uma falha independente no teste do contrato Prisma. O teste construía `PrismaClientKnownRequestError` apenas com `code`, enquanto a assinatura real do Prisma 5.22.0 exige `code` e `clientVersion`. O mock local do Vitest aceitava a forma incompleta, mas o TypeScript completo não.

## Decisão arquitetural

O contrato passou a distinguir erro interno de erro público. `PublicApiError` é a classe explícita para mensagens de domínio deliberadamente classificadas como seguras. Erros comuns que apenas possuem `status` não têm autorização para transportar sua mensagem original.

O mapeador central responde com mensagens neutras e códigos estáveis para status conhecidos. Falhas inesperadas são registradas apenas no servidor e recebem fallback seguro no corpo. A regra de visibilidade não foi alterada: recursos privados continuam podendo retornar `404` neutro para não revelar sua existência.

## Implementação relevante

| Arquivo | Garantia |
|---|---|
| `src/lib/apiErrors.ts` | Define `PublicApiError`, códigos públicos estáveis e o mapeamento seguro de status, JSON inválido e erros Prisma. |
| `src/lib/apiErrors.test.ts` | Prova que mensagens privadas não são ecoadas; cobre `PublicApiError`, JSON inválido, Prisma `P2025/P2002/P2003` e fallback de erro inesperado. |
| `src/app/api/hardening-error-mapping.test.ts` | Exercita respostas de rota e confirma que a sentinela privada não chega ao cliente. |
| `src/app/api/campaigns/import/route.ts` | Não serializa mais `error.message`, `error.validation` ou detalhes Zod internos. |
| Rotas em `src/app/api/**` | Respostas de payload inválido usam o contrato público central, sem expor o formato interno do schema. |

A correção V20.4.1 no teste Prisma adicionou apenas o valor sintético `clientVersion: 'test-client-5.22.0'`. Não há segredo, conexão ou dado de produção nesse valor.

## Matriz de respostas

| Status | Código público | Princípio |
|---:|---|---|
| `400` | `INVALID_REQUEST` ou `INVALID_JSON` | Informa que a requisição é inválida sem expor campos, valores ou detalhes internos do schema. |
| `401` | `AUTHENTICATION_REQUIRED` | Exige autenticação sem revelar o estado ou a identidade de recursos protegidos. |
| `403` | `ACCESS_DENIED` | Usa mensagem genérica; não devolve regra interna, papel, ID ou nome. |
| `404` | `RESOURCE_NOT_FOUND` | Mantém resposta neutra para recursos inexistentes ou ocultos. |
| `409` | `CONFLICT` | Expõe somente conflito público estável, não a mensagem privada da exceção. |
| `422` | `INVALID_REFERENCE` ou `IMPORT_VALIDATION` | Indica dados ou referências inválidas sem devolver validação interna completa. |
| `429` | `RATE_LIMITED` | Mantém a proteção de limitação; as rotas preservam `Retry-After` e `Cache-Control: no-store`. |
| `500` | `INTERNAL_ERROR` | Usa fallback seguro; stack, IDs e mensagem inesperada ficam somente no log do servidor. |

Somente `PublicApiError` pode definir uma mensagem específica de domínio no mapeador. O campo `code` permite que clientes dependam de um identificador estável, em vez de interpretar texto interno.

## Validação

Todos os comandos exigidos foram executados após a correção V20.4.1:

| Comando | Resultado |
|---|---|
| `npx prisma generate` | **Aprovado** usando uma URL PostgreSQL sintética local; não abriu conexão nem executou operação de banco. |
| `npx prisma format --check` | **Aprovado** — schema formatado corretamente. |
| `npx prisma validate` | **Aprovado**. |
| `npx tsc --noEmit -p .` | **Aprovado**, sem erros. |
| `npm run lint -- --dir src` | **Aprovado**, sem warnings ou erros ESLint. |
| `npm test -- --run` | **Aprovado** — 19 arquivos de teste e 146 testes. |
| `npm run build` | **Aprovado** — compilação e type-check de produção concluídos. |

A suíte mantém a prova de que a mensagem `arquivo privado secreto` com status `403` não aparece na resposta, e que a resposta não contém stack, ID ou contexto interno.

## Banco e migrations

Nenhuma migration foi criada, revisada para aplicação ou executada neste marco. Não houve operação de banco, conexão com PostgreSQL real, alteração de schema, alteração de dados de usuário ou exclusão de dados. A URL usada exclusivamente em `prisma generate` foi sintática, local e não conectou a banco.

Também não foram executados `db:smoke`, scripts de integração, deploy, publicação, `prisma migrate reset` ou `DROP DATABASE`.

## Limitações e próximo marco

Os testes reais de constraints, rollback e round-trip ainda dependem de uma base PostgreSQL de teste isolada. Esta entrega não declara integração de banco como aprovada e não substitui essa prova por mocks.

O próximo marco planejado é o **M2 — validação PostgreSQL isolada**. Ele deverá comprovar a URL de teste, executar primeiro o smoke de leitura e só depois os scripts de integração autorizados. Não foi iniciado nesta tarefa.

## Confirmação de escopo

A comparação com o pacote-base da V20.4.1 confirmou que esta entrega documental não alterou `src/**`, `prisma/**`, `package.json`, lockfile, scripts de banco ou configurações de infraestrutura. O Marco 1 está **documentalmente fechado**.
