# Prompt de transição — Q07: Auto-layout opcional e caminhos de pistas

Q06 está **APROVADO** em `Q06_DIAGNOSTICOS_COMPILADOR_RELATORIO.md`. Antes de alterar o projeto, leia também `Q05_VISTAS_SALVAS_RELATORIO.md`, `Q06_DIAGNOSTICOS_COMPILADOR_PROMPT.md`, `todo.md`, o schema/migrations, o editor do Quadro, os serviços de `BoardNode`, `BoardEdge`, `Relationship`, hipóteses/evidências, vistas e os testes de acessibilidade/estado local.

## Objetivo

Melhorar a legibilidade do Quadro de Investigação com auto-layout opcional e reversível para nós existentes e com destaque explícito de caminhos entre duas fichas. O recurso deve melhorar a leitura sem retirar o controle do Mestre, sem transformar sugestões visuais em fatos e sem criar novas arestas.

## Escopo permitido

Implemente apenas:

1. **Auto-layout opcional:** calcular uma prévia local de posições para os `BoardNode` já existentes, preservando seus IDs e sem criar/remover nós ou arestas.
2. **Preview/cancelamento:** apresentar a prévia antes de qualquer persistência; cancelar deve restaurar imediatamente as posições locais anteriores.
3. **Persistência explícita:** somente uma ação inequívoca do OWNER pode salvar as posições aprovadas, usando o contrato existente de atualização do quadro e validação campaign-scoped.
4. **Caminhos de pistas:** permitir selecionar origem e destino e destacar um caminho usando somente `Relationship` oficiais e/ou evidências da hipótese selecionada, com legenda visível da origem de cada segmento.
5. **Acessibilidade e movimento:** suporte a teclado, foco, Escape para cancelar, estado vazio e `prefers-reduced-motion`. Não introduzir animações contínuas.

## Regras de domínio

`CampaignFile` e `Relationship` continuam sendo fontes canônicas de conteúdo e fatos oficiais. `BoardNode` guarda posições; `BoardEdge` é somente visual. Hipóteses/evidências permanecem raciocínio administrativo. O auto-layout nunca cria `BoardEdge` ou `Relationship`, não infere conexão ausente e não edita dados fora das posições dos nós existentes.

O caminho deve distinguir, em cor, estilo, legenda e dados, pelo menos:

| Origem | Regra |
| --- | --- |
| Relação oficial | Usa somente `Relationship` autorizado e seus nós existentes no quadro; não reconstruir visibilidade no cliente. |
| Evidência de hipótese | Usa somente a hipótese selecionada e suas evidências válidas; não promover evidência a relação oficial. |
| Ausência | Mostrar estado explicativo quando não houver caminho ou quando origem/destino não estiverem no quadro ativo. |
| Ambiguidade | Se houver mais de um caminho, aplicar ordenação determinística e permitir seleção explícita; não escolher como fato narrativo. |

Não reutilize o diagnóstico Q06 para mutar dados. O caminho é uma visualização local. Não iniciar planejamento operacional de sessões, briefing/timeline publicado, rate limiting compartilhado, object storage ou backup nesta etapa.

## Gate antes da implementação

Audite sem escrita o modelo atual de posições, endpoints de `BoardNode`, interação de drag/pan, filtros/camadas Q02, overlay Q03, anotações Q04, vistas Q05 e diagnósticos Q06. Documente o algoritmo mínimo escolhido, seus limites de profundidade/tamanho, a estratégia de cancelamento e o tratamento de ciclos/empates antes de editar o código.

Se for necessária migration, criação de arestas persistentes, infraestrutura externa ou mudança de política de publicação, pare e marque **BLOQUEADO — fora do escopo de Q07**. Não use `migrate reset`, `DROP`, seed amplo, limpeza global, banco de produção ou reparo manual. Nenhuma nova dependência ou alteração de lockfile é permitida.

## Testes e validação obrigatória

Cubra com testes puros/contratuais: grafo vazio, nó único, caminho oficial direto, caminho oficial com ciclo, caminho sem destino, evidência de hipótese separada, ausência de nós no quadro, múltiplos caminhos com desempate determinístico, preview/cancelamento, confirmação de persistência e isolamento de `BoardEdge`/`Relationship`.

Cubra OWNER, PLAYER/P1–P4, link público e ausência de sessão onde houver rota/serviço. O jogador e o público não podem receber auto-layout administrativo, posições em preview, caminhos internos, hipóteses ou evidências privadas.

Execute, quando aplicável, `pnpm exec prisma generate`, `pnpm exec prisma format --check`, `pnpm exec prisma validate`, `pnpm exec tsc --noEmit -p .`, `pnpm exec next lint --dir src`, `pnpm exec vitest run --run` e `pnpm run build`. Se houver integração PostgreSQL, use somente `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1` e registre saída sanitizada.

Faça captura autenticada administrativa com preview, cancelamento e caminho, anonimizando nomes, campanha, dados e IDs. Verifique também que a restauração de uma vista Q05 continua local e que diagnósticos Q06 permanecem somente leitura.

## Entrega

Ao terminar, escreva `Q07_AUTO_LAYOUT_CAMINHOS_RELATORIO.md`, atualize `todo.md`, registre riscos e rollback e crie o prompt de Q08 somente se Q07 for aprovado. Declare **APROVADO**, **FALHOU** ou **BLOQUEADO**. Pare no primeiro gate que falhar; não avance para Q08 nesse caso.
