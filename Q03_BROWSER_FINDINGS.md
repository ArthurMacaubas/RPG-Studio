# Achados da validação visual de Q03

A rota administrativa do Quadro foi aberta com sessão autenticada no servidor local. Após a hidratação, o canvas exibiu três nós e duas relações oficiais vindas do grafo administrativo. Os relacionamentos apareceram em camada distinta dos fios visuais: linhas tracejadas, rótulos com direção e tipo e marcadores próprios para relações direcionais.

A seleção por clique abriu um painel lateral somente leitura com origem, destino, tipo, importância, visibilidade, rótulo e descrição, além das ações de abrir origem/destino. O painel declarou que a relação não é editável pelo overlay. O foco por teclado foi exposto como elemento `role=button`, com ativação por Enter/Espaço. Escape global fechou a seleção sem qualquer chamada de escrita.

O filtro local de importância `Importante` reduziu o overlay de duas relações para uma, mantendo os nós do canvas e sem nova consulta por tecla. O desligamento da camada de relações oficiais removeu o desenho e limpou a seleção; a ação de limpar filtros restaurou o estado padrão, com as relações oficiais visíveis novamente.

A captura compartilhável `evidence/q03/q03-overlay-relacao-selecionada-anonimizado.webp` foi produzida com substituição temporária de nomes e textos no DOM. A alteração foi somente visual, não disparou eventos de formulário e não foi persistida. Nenhuma ficha, relação, aresta visual ou hipótese foi criada, editada ou removida durante a validação.
