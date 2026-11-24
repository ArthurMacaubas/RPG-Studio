# Desenvolvimento

## Preparação

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Use uma base PostgreSQL isolada. `DATABASE_URL` é runtime e `DATABASE_URL_UNPOOLED` é conexão direta para migrations. Não copie `.env.local` para branches ou Pull Requests.

## Convenções

Páginas ficam em `src/app`; componentes reutilizáveis em `src/components`; lógica de domínio em `src/services`; regras puras e integração em `src/lib`; schema e migrations em `prisma`. Use TypeScript estrito, validação na borda, serviços para persistência e CSS Modules para estilos de componente.

## Alterações de banco

Edite `prisma/schema.prisma`, gere uma migration aditiva com `npx prisma migrate dev` apenas em base local e confira SQL, índices, foreign keys e impacto de dados. Execute `npx prisma validate`, `npx prisma format --check` e testes de serviço. Nunca teste migration destrutiva em produção.

## Commits e branches

Use commits focados: `feat:`, `fix:`, `perf:`, `docs:`, `test:` ou `chore:`. Não misture conteúdo da campanha com alterações genéricas. A contribuição deve explicar dependências e ter documentação em inglês quando destinada ao upstream.

## Checklist

- [ ] diff revisado e sem arquivos privados
- [ ] autenticação/autorização preservadas
- [ ] schema e migrations revisados
- [ ] lint, tipos, testes e build executados quando aplicável
- [ ] documentação e changelog atualizados
- [ ] limitações e validações não executadas registradas
