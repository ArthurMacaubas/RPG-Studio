# Achados da validação visual Q02

A rota administrativa autenticada do Quadro de Investigação carregou com os estilos após reiniciar o servidor de desenvolvimento que estava com assets CSS antigos. O painel lateral exibiu busca local, tipo, escopo, favoritas, tags, importância/visibilidade de relações oficiais, status/stance e as cinco camadas: fichas, relações oficiais, arestas visuais, evidências e hipóteses.

A campanha sintética de validação abriu sem nós persistidos no canvas e sem criação de dados durante a captura inicial. O estado vazio original informou como adicionar o primeiro arquivo. O painel informou `0 nós no canvas` e `0 de 0` relações oficiais, mantendo relações oficiais como fonte canônica consultada/filtrada, sem overlay visual no Q02.

As capturas do navegador foram geradas em `/home/ubuntu/screenshots/localhost_2026-08-25_07-23-51_5668.webp` e nos arquivos anteriores da mesma rota. IDs de campanha e dados de autenticação não devem ser reproduzidos em documentação ou no pacote final.

A captura `/home/ubuntu/screenshots/localhost_2026-08-25_07-25-24_5356.webp` mostrou a camada de fichas desligada. O canvas exibiu a mensagem acessível `A camada de fichas está desligada. Ative-a em "Camadas visuais" para voltar a ver os nós.`, enquanto o contador local passou a `0 nós no canvas`; relações oficiais permaneceram somente no contador do painel.

Para a evidência compartilhável, os textos de campanha/fichas foram substituídos localmente no DOM por rótulos neutros, sem requisição ou persistência. A captura `/home/ubuntu/screenshots/localhost_2026-08-25_07-26-26_8714.webp` confirma o estado padrão com três nós, o painel aberto, camadas marcadas e contador de relações canônicas; a URL administrativa permaneceu local e autenticada apenas durante a validação.

A captura anonimiz​ada `/home/ubuntu/screenshots/localhost_2026-08-25_07-26-53_6357.webp` mostrou a busca local `q02-sem-correspondencia`, `1 filtro ativo`, `0 nós no canvas`, a mensagem `Nenhuma ficha corresponde aos filtros atuais` e a ação `Limpar filtros`, sem alteração persistente.

Após clicar em `Limpar filtros`, a UI retornou a `Nenhum filtro ativo` e `3 nós no canvas`. A limpeza foi apenas de estado React local; nenhuma chamada de criação, edição, remoção, migration ou alteração de publicação foi realizada durante a captura.

A captura final anonimiz​ada `/home/ubuntu/screenshots/localhost_2026-08-25_07-29-14_7155.webp` confirmou o painel em estado padrão com `2 de 2 relações correspondem ao filtro`, sem o erro de pluralização observado na captura intermediária. A anonimização foi apenas DOM local e não altera a fonte de dados.
