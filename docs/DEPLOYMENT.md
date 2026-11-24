# Deploy e operação

## Arquitetura

O frontend/backend Next.js pode ser executado em Vercel e usa PostgreSQL/Neon. O repositório não contém `vercel.json` nem IDs de projeto; portanto, a ligação da conta é configuração externa e não deve ser documentada com valores reais.

## Variáveis

Use `.env.example` como contrato:

- `DATABASE_URL`: conexão pooled de runtime.
- `DATABASE_URL_UNPOOLED`: conexão direta para Prisma migrations/administração.
- `TRUST_PROXY_HEADERS`: habilita confiança explícita em headers de proxy.
- `PERFORMANCE_LOGS`, `PERFORMANCE_SLOW_QUERY_MS`: telemetria server-side opt-in.
- `NEXT_PUBLIC_PERFORMANCE_LOGS`: reservado no exemplo; não substitui `PERFORMANCE_LOGS` no código atual.

Nunca publique valores, tokens ou `.env.local`.

## Processo seguro

```text
instalar dependências -> prisma generate -> validate/format -> testes -> build
       -> configurar ambiente -> migrate deploy -> deploy -> smoke read-only
```

`npm run build` executa `prisma generate` e `next build`. Migrations devem usar `DATABASE_URL_UNPOOLED` quando a plataforma oferecer conexão direta. Não execute `prisma migrate dev`, scripts `test:db:*` ou smoke contra produção sem autorização e isolamento.

## Rollback e diagnóstico

Rollback de aplicação deve apontar para um deployment anterior. Rollback de schema precisa seguir a política do Neon e não deve apagar colunas/tabelas automaticamente. Verifique logs de build, logs de função, `DATABASE_URL`, geração do Prisma e migrations aplicadas. Healthcheck HTTP isolado não prova autenticação nem rotas protegidas.

Não há procedimento de backup/restore implementado no repositório; defina retenção e recuperação no provedor antes de produção.
