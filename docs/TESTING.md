# Testes e validação

## Ferramentas e comandos

- Unitários e serviços: `npm run test:run` (`vitest run --run`).
- TypeScript: `npx tsc --noEmit`.
- Lint: `npm run lint`.
- Prisma: `npm run prisma:validate` e `npm run prisma:format`.
- Build: `npm run build`.
- Smoke read-only: `npm run db:smoke`.
- Testes PostgreSQL isolados: scripts `test:db:*` com variáveis explícitas.

## Cobertura atual

Há testes puros para acesso, autenticação, erros de API, temas, 3DeT, Markdown, regras de combate, transferência, relações, publicação e serviços. Há scripts de integração PostgreSQL para round-trip, integridade relacional, quadro, hipóteses, sessões e briefing. Não foi encontrado setup Playwright/Cypress versionado neste checkout; testes de browser não são declarados como automatizados.

## Limites

Smoke e integração de banco exigem ambiente e credenciais apropriados. O build não prova autorização de cada rota. Testes unitários não provam latência de Neon, uploads reais, múltiplas réplicas ou comportamento visual em dispositivos.

## Validação manual

Para mudanças de UI, testar teclado, foco, Enter, loading, erro, disabled, viewport estreito e modo jogador. Para APIs, verificar status, `Accept: application/json`, payload inválido, ausência de sessão, papel PLAYER, isolamento de campanhas e resposta sem dados privados.
