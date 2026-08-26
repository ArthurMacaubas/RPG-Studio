# RPG Campaign Studio — V10

A rodada V10 fortalece segurança, condução de sessões, experiência do jogador e exportação sem migrar uploads para S3.

## Entregas

A autorização por arquivo foi concluída com `CampaignFileGrant`, `restrictToGrants`, guards centrais e filtros de grants na listagem, busca, dashboard, Modo Jogador autenticado e link público. O Mestre mantém acesso implícito; jogadores só veem arquivos liberados globalmente ou concedidos individualmente.

A auditoria de segurança foi integrada a registro, login, logout, convites, publicação, upload de anexos, grants e exclusão permanente. O endpoint `GET /api/campaigns/[id]/audit` é exclusivo do Mestre. Os endpoints de grants são `GET/POST /api/files/[id]/grants` e `DELETE /api/files/[id]/grants/[userId]`.

O autosave do editor agora exibe salvando, salvo com horário e falha. A busca global indexa nome, descrição, conteúdo, tags, comentários, rótulos e arquivos relacionados, sempre respeitando grants.

A nova Sala de Sessão está em `/campaigns/[id]/sala`, disponível somente ao Mestre e visível na Sidebar. Ela oferece seleção de sessão, cronômetro local, checklist persistente, links rápidos para Quadro/Mapa, contagem de publicação e atividade recente.

A experiência autenticada do jogador recebeu capa, contadores, destaque de personagem, busca ampliada, filtros com contagem, tags e resumo de ficha. O Quadro de Investigação recebeu navegação por teclado, foco visível e títulos acessíveis para conexões. Fichas passaram a persistir pronomes e usos do inventário.

A exportação ganhou o formato `visual`, disponível em `/api/campaigns/[id]/export?format=visual`, gerando um caderno HTML estilizado, seguro contra HTML injetado e preparado para impressão.

## Migração

A migration está em `prisma/migrations/0004_file_grants_audit/migration.sql`. Após revisar a URL do Neon, aplicar com o fluxo de produção do projeto, por exemplo:

```bash
npx prisma migrate deploy
```

Depois, conferir o status:

```bash
npx prisma migrate status
```

## Validação executada

- `DATABASE_URL=[redacted]
- `npx tsc --noEmit -p .`
- `npx next lint --dir src`
- `npm test -- --run` — 15 testes passando
- `npm run build` — build de produção concluído

Os uploads continuam como data URL, conforme solicitado para esta rodada.
