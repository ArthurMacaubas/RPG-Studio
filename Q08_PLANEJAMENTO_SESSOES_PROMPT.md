# Prompt de transição — Q08: Planejamento operacional de sessões

Q07 está **APROVADO** em `Q07_AUTO_LAYOUT_CAMINHOS_RELATORIO.md`. Antes de alterar o projeto, leia também `Q07_MODELING_DECISION.md`, `Q07_AUTO_LAYOUT_CAMINHOS_PROMPT.md`, `Q06_DIAGNOSTICOS_COMPILADOR_RELATORIO.md`, `todo.md`, `QUADRANTES_RESTANTES_MAPA.md`, o schema/migrations, os serviços/rotas/componentes de `Session`, export/import, hipóteses/evidências e vistas Q05.

## Objetivo

Transformar sessões administrativas em uma ferramenta de preparação e acompanhamento para o Mestre, sem publicar rascunhos e sem duplicar conteúdo canônico. O resultado deve permitir criar, editar e concluir um planejamento de sessão e navegar para os arquivos, hipóteses e vistas do quadro relacionados.

## Escopo permitido

Implemente somente:

1. **Planejamento de sessão:** ampliar `Session` com objetivos, roteiro, checklist estruturado e resumo pós-sessão, preservando os campos e fluxos existentes.
2. **Vínculos administrativos:** relacionar uma sessão a `CampaignFile`, hipóteses e vistas Q05 por entidades ou metadados justificados, sempre campaign-scoped e sem copiar o conteúdo de origem.
3. **Fluxo de acompanhamento:** permitir criar, editar, marcar itens do checklist e concluir o planejamento; mostrar estado vazio e erros públicos seguros.
4. **Navegação contextual:** na tela administrativa de sessão, abrir a vista correspondente do Quadro e destacar hipóteses relevantes por ações locais já existentes; não criar relações, nós ou evidências automaticamente.
5. **Transferência:** incluir os novos campos e vínculos no export/import administrativo com remapeamento explícito, compatibilidade de documentos legados e rollback em erro.
6. **Isolamento:** manter planejamento, objetivos, roteiro, checklist, resumo, hipóteses privadas, pins, grupos, vistas e diagnósticos fora de PLAYER, público e publicação.

## Não-escopo

Não criar briefing/timeline publicado, não mudar política de publicação, não expor conteúdo administrativo ao jogador, não iniciar rate limiting, object storage ou backup, não adicionar IA, não criar nova fonte de verdade e não duplicar o conteúdo de fichas, hipóteses ou vistas dentro da sessão.

## Gate de modelagem e migration

Antes de qualquer migration, faça auditoria de compatibilidade sem escrita no PostgreSQL isolado de teste e documente a decisão em `Q08_MODELING_DECISION.md`. Verifique como o `Session` atual é usado por sala de sessão, combate, timeline, export/import e jogador. Se a modelagem exigir mudança incompatível, provider ausente, alteração de política ou operação destrutiva, declare **BLOQUEADO** e não tente saneamento automático.

Toda nova relação deve validar `campaignId` no serviço e na rota, exigir OWNER para leitura/escrita administrativa, rejeitar referências ausentes ou cross-campaign e usar transação para composição de múltiplos vínculos. Não usar `migrate reset`, `DROP`, `migrate dev` destrutivo, seed amplo, limpeza global, banco compartilhado ou reparo manual.

## Critérios determinísticos

O checklist deve ter itens estruturados, rótulo não vazio, limite de tamanho, ordem estável e estado booleano. Atualizações parciais não podem apagar silenciosamente itens omitidos. Objetivos e roteiro devem ter limites de payload e não podem armazenar dados fora do domínio. Resumo pós-sessão deve permanecer administrativo e opcional.

Os vínculos devem ser únicos por sessão e recurso, ordenar de maneira estável e ser removíveis sem apagar a ficha, hipótese ou vista referenciada. Uma vista Q05 inexistente ou de outra campanha deve ser rejeitada com erro público seguro. Ações de abrir vista e destacar hipótese devem ser somente de leitura/local; nenhuma ação contextual pode mutar o Quadro automaticamente.

## Testes e validação obrigatória

Cubra testes puros/contratuais para checklist, limites, ordenação, conclusão, referências inválidas, duplicidade e remoção de vínculos. Cubra OWNER, PLAYER/P1–P4, link público e ausência de sessão nas rotas/serviços aplicáveis. Teste export/import real com remapeamento de sessão, arquivos, hipóteses e vistas; confirme compatibilidade com documentos legados sem campos Q08.

Execute, quando aplicável:

```bash
pnpm exec prisma generate
pnpm exec prisma format --check
pnpm exec prisma validate
pnpm exec tsc --noEmit -p .
pnpm exec next lint --dir src
pnpm exec vitest run --run
pnpm run build
RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm exec tsx scripts/<script-q08>
```

Se uma migration for necessária, aplique-a apenas com `pnpm exec prisma migrate deploy` no PostgreSQL de teste depois da auditoria, registre o diff aditivo e valide rollback/compatibilidade. Se smoke, integração ou build falhar, pare no primeiro gate.

Faça captura autenticada administrativa somente se o fluxo estiver aprovado; anonimize campanha, nomes, IDs, conteúdo, URL, host e credenciais. Confirme estaticamente que o jogador não importa componentes, APIs ou tipos privados Q08.

## Entrega

Ao terminar, escreva `Q08_PLANEJAMENTO_SESSOES_RELATORIO.md`, atualize `todo.md` e `QUADRANTES_RESTANTES_MAPA.md`, registre migration, testes, riscos e rollback e crie o prompt de Q09 somente se Q08 for **APROVADO**. Declare **APROVADO**, **FALHOU** ou **BLOQUEADO** e pare no primeiro gate que falhar. Não antecipe Q09–Q12.
