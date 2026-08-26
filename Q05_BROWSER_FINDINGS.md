# Evidências de navegador Q05

- Rota administrativa validada: `/campaigns/[id]/investigacao`, com toolbar contendo `Vistas`.
- Painel `Vistas salvas` abriu corretamente e mostrou formulário com nome, tipo Sessão/Caso/Arco, descrição e `Salvar estado atual`.
- Criação pela UI concluída com uma vista temporária de sessão; a lista passou a exibir `1`, nome, descrição, `0 ref.`, `100%`, `sem busca`, `anotações visíveis` e os controles `Restaurar`, `Atualizar`, remoção e reordenação.
- Após alterar zoom local de 100% para 110% e desativar a camada `Relações oficiais`, o quadro ocultou as relações e exibiu 110%.
- `Restaurar` retornou o zoom para 100%, reexibiu as relações oficiais e apresentou toast `Vista restaurada ... Somente a navegação local foi alterada; o quadro canônico não foi modificado.`
- O contador de anotações foi corrigido de `0 anotaçãoões` para `0 anotações`.
- Os três nós canônicos, as duas relações oficiais e a hipótese de teste permaneceram presentes; nenhuma ação de restauração editou o conteúdo canônico.
- Capturas originais do navegador não devem ser distribuídas sem anonimização; a evidência final deve ocultar o nome da campanha e qualquer identificador exibido.

A segunda vista temporária foi preenchida e o seletor confirmou a opção `Caso`; o painel manteve a primeira vista persistida e a operação não alterou o quadro canônico.

Após a resposta 201 e nova leitura da página, o painel exibiu `2` vistas: a primeira como `Sessão` e a segunda como `Caso`, cada uma com seus controles de restauração, atualização e reordenação. O servidor não registrou erro HTTP.

Ao mover a primeira vista para baixo, a lista passou a ordenar `Caso` antes de `Sessão`, confirmando a reordenação persistida pela interface. Os dois cartões permaneceram acessíveis e o quadro continuou com os mesmos nós e relações oficiais.

O primeiro clique de remoção foi acionado; a leitura imediata manteve os dois cartões visíveis, portanto a operação foi tratada como assíncrona e será confirmada pelo log/estado seguinte antes da limpeza final.

O log local confirmou `DELETE ... 204` para a vista de Caso; após nova leitura, a interface mostrou apenas a vista temporária de Sessão, com contador `1`. Nenhuma rota retornou erro.

A remoção final concluiu; a leitura da interface mostrou `0` vistas salvas e o toast `Vista removida`, enquanto os três nós e as duas relações oficiais permaneceram intactos. A limpeza visual Q05 foi concluída.
