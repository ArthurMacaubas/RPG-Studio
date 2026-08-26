
## Validação visual Q07 — preview e cancelamento

- A rota administrativa do Quadro carregou autenticada com três nós e duas relações oficiais visíveis.
- O botão **Layout** abriu um painel separado, com seção de Auto-layout, seção de Caminhos de pistas, legenda de Relação oficial versus Evidência e controles acessíveis de fechamento.
- **Pré-visualizar layout** exibiu `3 posições calculadas localmente` e a mensagem de que nada é salvo antes da confirmação.
- **Cancelar prévia** fechou o estado de preview e retornou o painel ao botão de pré-visualização; não foi executada confirmação nem chamada de persistência.
- O painel Q07 não ficou simultaneamente aberto com Anotações ou Vistas, preservando a legibilidade dos painéis existentes.
- Nenhum nome de campanha, ID interno, segredo ou conteúdo sensível é mantido neste registro.

## Validação visual Q07 — caminho oficial

- Foram selecionadas duas fichas existentes no quadro e executada a busca em **Relações oficiais**.
- O painel exibiu um caminho de dois saltos entre os nós, com cada segmento rotulado como **Relação oficial** e a lista de etapas apresentada no resultado.
- A legenda manteve separadas as fontes **Relação oficial** e **Evidência — não é relação oficial**.
- A busca foi local e não criou `BoardEdge`, `Relationship` ou qualquer outro registro; não foi necessária fixture adicional.

## Evidência anonimizada

A captura administrativa foi mascarada para preservar a estrutura do painel Q07, os controles de Auto-layout e a legenda de fontes, ocultando o workspace, nomes selecionados, resultado com fichas e demais identificadores. A revisão final não encontrou credenciais, URLs, IDs ou conteúdo de campanha legível na área preservada.

## Revalidação após build

Após reinício limpo do servidor e novo build, o painel Q07 carregou novamente na rota administrativa. A prévia mostrou as posições calculadas localmente e os controles de cancelamento/confirmação, sem erro de bundle ou resposta administrativa inesperada.

A segunda validação repetiu o ciclo **Pré-visualizar layout → Cancelar prévia** no servidor final, retornando ao estado sem preview. Em seguida, a origem foi selecionada para a busca oficial; nenhuma confirmação de posições foi executada.

## Caminho e seleção explícita após build

A busca oficial final exibiu um caminho de dois saltos no painel Q07. O resultado contém o controle acessível **Caminho 1**, marcado como alternativa selecionada, e cada segmento permanece identificado como **Relação oficial**. O canvas recebeu apenas a sobreposição visual local do caminho; nenhuma aresta ou relação foi criada.
