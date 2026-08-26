# Achados da validação visual de Q04

A rota administrativa do Quadro foi aberta com sessão autenticada no servidor local recompilado. A primeira renderização exibiu o estado de carregamento; após a hidratação, o canvas mostrou três fichas, duas relações oficiais e os filtros/camadas de Q02/Q03 preservados.

O botão `Anotações` abriu o painel `Pins e grupos` com contador, explicação de que os elementos são administrativos e não são fichas, relações, fios ou evidências, formulário de novo pin, formulário de novo agrupamento, seleção de fichas para composição e lista vazia explicativa. Os campos têm labels, limites visíveis e foco nativo de teclado; os botões de cor expõem `aria-label` e `aria-pressed`.

O painel inicialmente ficou fora da área visível por compartilhar a posição direita com hipóteses. O CSS foi ajustado para posicioná-lo na área central disponível, sem sobreposição crítica; a captura posterior confirmou o painel visível ao lado dos filtros e antes do painel de hipóteses.

Nenhum pin ou grupo foi criado durante a captura visual, para não deixar dados sintéticos na campanha. A integração de criação/edição/remoção foi validada por testes unitários e a persistência/remapeamento foi validada no PostgreSQL de teste com dados temporários limpos ao final.

A camada local `Anotações do Mestre` aparece na legenda de camadas e permanece desligável sem alterar dados. O overlay de relações oficiais, os fios visuais e o painel de hipóteses continuam separados.

A validação autenticada também criou, listou e removeu um pin temporário e um agrupamento temporário pela própria interface. O painel confirmou o contador 2, exibiu o grupo com dimensões e número de fichas, e voltou ao contador 0 após a remoção. A captura compartilhável foi feita antes da limpeza, com textos visíveis anonimizados somente no DOM; a campanha ficou limpa depois da remoção pela UI.

Arquivo visual: `evidence/q04/q04-pins-grupos-anonimizado.webp`.
