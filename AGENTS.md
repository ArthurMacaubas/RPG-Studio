# Instruções para agentes

RPG Campaign Studio usa Next.js 14 App Router, TypeScript, CSS Modules, Prisma 5 e PostgreSQL. Esta fork mantém melhorias genéricas para possível contribuição ao [upstream](https://github.com/ArthurMacaubas/RPG-Studio) e mantém a campanha O Sangue de Arashi fora das contribuições públicas.

Leia [`docs/INDEX.md`](docs/INDEX.md) antes de mudanças transversais. O código atual prevalece sobre documentação antiga.

## Regras

- Preserve autenticação, autorização, isolamento entre campanhas, dados e fluxos existentes.
- Use serviços em `src/services`, helpers em `src/lib` e componentes compartilhados em `src/components`.
- Rotas validam entrada e delegam persistência a serviços; componentes não acessam Prisma diretamente.
- Use migrations aditivas e nunca altere produção durante testes.
- Não versionar `.env`, tokens, URLs privadas, dados da campanha ou artefatos de infraestrutura.
- Não introduzir conteúdo ou identidade visual de O Sangue de Arashi em branches destinadas ao upstream.
- Investigue gargalos antes de otimizar e só declare ganhos com métricas coletadas.
- Preserve responsividade, acessibilidade e estados de loading/erro.
- Prefira commits pequenos, Conventional Commits quando compatível e branches por contribuição.

## Validação

Para mudanças relevantes, revise o diff e execute os comandos aplicáveis: `npm run prisma:validate`, `npm run prisma:format`, `npx tsc --noEmit`, `npm run lint`, `npm run test:run` e `npm run build`. Testes PostgreSQL usam base isolada; `npm run db:smoke` é somente leitura.

Documente limitações, migrations, decisões e testes em `docs/` e atualize `CHANGELOG.md`. Não faça commit, push, force push, reset destrutivo ou descarte de alterações sem autorização explícita.
