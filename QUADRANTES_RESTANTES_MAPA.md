# Mapa de execução dos quadrantes restantes

## Regra de execução

Q02, Q03, Q04, Q05, Q06, Q07 e Q08 estão aprovados. A execução posterior seguirá a ordem obrigatória do Prompt Mestre: **Q03 → Q04 → Q05 → Q06 → Q07 → Q08 → Q09 → Q10 → Q11 → Q12**. Cada quadrante deverá ter gate, plano, implementação restrita ao objetivo, validação, relatório estável, prompt do seguinte e checkpoint antes do avanço.

A execução deve parar no primeiro quadrante que falhar ou ficar bloqueado por banco de teste ausente, dados incompatíveis, infraestrutura obrigatória ausente, ambiguidade arquitetural ou ação que exija produção/credencial não disponibilizada com segurança. Não é permitido pular um quadrante bloqueado nem implementar antecipadamente um recurso de quadrante posterior.

## Sequência e dependências

| Quadrante | Objetivo delimitado | Dependência de entrada | Gate específico |
|---|---|---|---|
| Q03 | Overlay somente leitura do grafo oficial `Relationship` no quadro | Q02 aprovado | Não editar/criar relações; não expor ao jogador/público; distinguir de `BoardEdge` |
| Q04 | Pins, notas e agrupamentos visuais persistidos | Q03 aprovado; decisão de modelagem documentada | Auditoria aditiva de schema, banco PostgreSQL de teste confirmado, OWNER/campanha, backup administrativo |
| Q05 | Vistas salvas por sessão/caso/arco | Q04 aprovado | Definir pertencimento de pins/grupos, remapeamento de referências e restauração sem alterar quadro canônico |
| Q06 | Diagnósticos investigativos determinísticos e Compilador | Q05 aprovado | Regras explicáveis, testes determinísticos, links de correção, OWNER-only |
| Q07 | Auto-layout opcional e caminhos de pistas | Q06 aprovado | Preview/cancelamento, persistência explícita, sem criação de arestas, sem animação contínua |
| Q08 | Planejamento operacional de sessões | Q07 aprovado | Auditoria/migration, export/import e remapeamento; rascunhos não publicados |
| Q09 | Briefing/timeline publicados para jogadores | Q08 aprovado | Projeção própria, política de publicação, ausência de dados administrativos e IDs privados |
| Q10 | Rate limiting compartilhado e observabilidade de abuso | Q09 aprovado | Avaliar infraestrutura; bloquear se Redis/serviço compartilhado e provisionamento seguro não existirem |
| Q11 | Object storage para anexos grandes | Q10 aprovado | Confirmar provider, bucket/container, segredo e retenção; bloquear se ausentes |
| Q12 | Centro de backup, restauração e auditoria | Q11 aprovado | Round-trip real no PostgreSQL de teste, rollback, referências remapeadas e confirmação explícita |

## Critérios transversais

Todos os quadrantes devem preservar TypeScript estrito, lint, testes, build, acessibilidade por teclado, política server-side, escopo por campanha e ausência de segredos em código, logs, relatórios e anexos. Migrations são aditivas, revisadas e aplicadas primeiro somente em PostgreSQL isolado de teste. Nenhuma operação de produção, reset, drop, limpeza global ou seed amplo é permitida.

## Estado inicial

Q01.1, Q02, Q03, Q04, Q05, Q06, Q07 e Q08 estão aprovados. Q08 adicionou planejamento relacional privado de sessões, remapeamento administrativo e vínculos campaign-scoped sem publicar ou converter `CampaignFile SESSION`, com migration aditiva somente no PostgreSQL isolado de teste, 42 suítes/258 testes, build, integração e captura administrativa aprovados. Q09 é o único quadrante autorizado para a próxima implementação; Q10–Q12 permanecem apenas mapeados até seus gates.
