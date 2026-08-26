# Prompt de transição — Q09: Briefing e timeline publicados para jogadores

Q08 está **APROVADO** em [`Q08_PLANEJAMENTO_SESSOES_RELATORIO.md`](Q08_PLANEJAMENTO_SESSOES_RELATORIO.md). Antes de alterar o projeto, leia também [`Q08_MODELING_DECISION.md`](Q08_MODELING_DECISION.md), o relatório/prompt de Q07, a política de publicação, as projeções server-side de `ViewerContext`, as rotas de jogador e link público, os serviços de timeline/briefing, o schema/migrations e os testes de publicação.

## Objetivo

Implementar uma superfície de **briefing e timeline publicados** para jogadores, usando somente uma projeção pública autorizada pelo servidor. A entrega deve permitir ao Mestre preparar e publicar conteúdo destinado ao jogador sem expor planejamento administrativo, hipóteses privadas, pins, grupos, vistas, diagnósticos, dados de combate não publicados ou qualquer identificador interno indevido.

## Escopo permitido

Implemente somente:

1. **Briefing público:** criar ou ampliar uma entidade/projeção explicitamente publicada para apresentar aos jogadores um briefing curado da campanha, caso a auditoria confirme que não existe contrato compatível.
2. **Timeline pública:** exibir eventos/tópicos publicados em ordem estável, com projeção mínima e autorização server-side por campanha, membro, grant e link público.
3. **Publicação explícita:** exigir ação OWNER inequívoca para publicar, atualizar ou retirar briefing/tópico; rascunhos devem permanecer inacessíveis a PLAYER/P1–P4 e link público.
4. **Projeção segura:** retornar somente campos aprovados para cada contexto, sem Prisma amplo, conteúdo administrativo, dados de sessão privada ou IDs internos desnecessários.
5. **Compatibilidade:** preservar os fluxos legados de timeline, publicação e Modo Jogador quando a auditoria demonstrar dependência ativa; documentos e dados anteriores devem continuar legíveis.
6. **Testes:** cobrir matriz OWNER, PLAYER/P1–P4, link público, Modo Jogador habilitado/desabilitado, campanha ausente, item arquivado/lixeira, não publicado, grants e acesso direto.

## Não-escopo

Não importar nem publicar automaticamente objetivos, roteiro, checklist, resumo, hipóteses, vistas, pins, grupos, diagnósticos ou qualquer outro dado administrativo Q08. Não criar rate limiting, Redis, object storage, backup, IA ou infraestrutura de Q10–Q12. Não transformar planejamento de sessão em conteúdo público por conversão implícita. Não alterar `Relationship` ou `BoardEdge` para representar timeline. Não criar uma segunda política de visibilidade fora da política server-side existente.

## Gate de auditoria e modelagem

Antes de qualquer migration ou escrita de banco, audite sem escrita as tabelas, migrations, serviços, rotas e consumidores de timeline, briefing, publicação e Modo Jogador. Determine se há entidade canônica existente ou se uma projeção pública própria é necessária. Documente a decisão em `Q09_MODELING_DECISION.md` antes da migration.

Se a modelagem exigir mudança incompatível, alteração de política não autorizada, provider ausente, banco não isolado, operação destrutiva ou conversão automática de dados administrativos, declare **BLOQUEADO** e não tente saneamento automático. Migrations, se necessárias, devem ser aditivas, revisadas e aplicadas primeiro somente ao PostgreSQL isolado de teste após auditoria. Não usar `migrate reset`, `DROP`, seed amplo, limpeza global ou produção/compartilhado.

## Critérios determinísticos

A publicação deve ser explícita, reversível e auditável. Um item não publicado nunca pode ser retornado ao jogador por acesso direto, alteração de query string, link público ou chamada de API fora da UI. A projeção pública deve filtrar campanha, estado ativo, publicação, audiência e grants no servidor; o cliente não pode reconstruir essas regras.

Briefing e timeline devem ter limites de tamanho, ordem estável, validação de datas e mensagens públicas neutras. O retorno deve omitir campos administrativos e não vazar nomes de tabelas, IDs internos, detalhes Zod, stack traces ou erros Prisma. O jogador deve receber somente conteúdo publicado e permitido ao seu contexto.

## Testes e validação obrigatória

Cubra contratos puros, publicação/retirada, limites, ordenação, datas inválidas, campanha cruzada, item ausente, arquivado, lixeira, não publicado e duplicidade. Cubra rotas e serviços para OWNER, PLAYER/P1–P4, link público, Modo Jogador ligado/desligado e ausência de sessão. Verifique que `SessionPlanningPanel`, `sessionPlansApi`, `SessionPlanning` e as rotas administrativas Q08 não são importados por jogador, público ou publicação.

Execute, quando aplicável:

```bash
pnpm exec prisma generate
pnpm exec prisma format --check
pnpm exec prisma validate
pnpm exec tsc --noEmit -p .
pnpm exec next lint --dir src
pnpm exec vitest run --run
pnpm run build
RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm exec tsx scripts/<script-q09>
```

Se qualquer smoke, integração, teste, lint, TypeScript ou build falhar, pare no primeiro gate. Faça captura browser somente após aprovação do fluxo e anonimize campanha, nomes, IDs, conteúdo, URL, host e credenciais. Ao final, escreva `Q09_BRIEFING_TIMELINE_PUBLICOS_RELATORIO.md`, atualize o checklist e prepare o prompt de Q10 somente se Q09 for **APROVADO**. Não antecipe Q10–Q12.

## Entrega esperada

Declare exatamente **APROVADO**, **FALHOU** ou **BLOQUEADO**. Registre a decisão de modelagem, migration e rollback, matriz de visibilidade, projeções, testes, integração PostgreSQL, evidência browser anonimizada e riscos residuais. Se Q09 falhar ou ficar bloqueado, interrompa a sequência e não inicie Q10.
