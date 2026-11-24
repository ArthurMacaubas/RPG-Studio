# Performance

## Alterações verificadas

Os commits `941f6b0` e `3f45d73` introduzem otimizações, não benchmarks históricos. O primeiro centraliza consultas de shell/listas em serviços, usa `Promise.all` onde as dependências permitem, carrega painéis client-side sob demanda, adiciona índices de listagem e cria telemetria opt-in. O segundo permite que exploradores recebam `initialData` server-rendered por `fileExplorerService`, reduzindo a necessidade de uma primeira busca client-side.

## Instrumentação

Defina `PERFORMANCE_LOGS=true` para logs JSON de escopo, nome, duração e status. `PERFORMANCE_SLOW_QUERY_MS` define o limiar padrão de 100 ms para logs de consultas Prisma. `NEXT_PUBLIC_PERFORMANCE_LOGS` existe no exemplo de ambiente, mas a implementação server-side usa `PERFORMANCE_LOGS`. Rotas instrumentadas recebem `Server-Timing`.

Os logs não são benchmark: são evidência operacional de uma execução específica. Esta auditoria não encontrou métricas antes/depois versionadas.

## Como medir

1. Use uma base de teste isolada, dataset representativo e o mesmo build.
2. Execute `PERFORMANCE_LOGS=true PERFORMANCE_SLOW_QUERY_MS=100 npm run start`.
3. Registre TTFB, `Server-Timing`, contagem de requests e logs `[perf]` por rota.
4. Repita ao menos cinco vezes em cold e warm start, descartando outliers documentados.
5. Compare a mesma rota e volume antes/depois; não compare ambientes diferentes como ganho.

## Gargalos restantes

Cold starts, latência Vercel-Neon, data URLs e payloads JSON grandes não têm métrica persistente no projeto. O rate limit em memória e a ausência de cache compartilhado continuam limitações operacionais.
