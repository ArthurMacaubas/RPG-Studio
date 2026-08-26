# Q08 — Evidência de validação browser anonimizada

A página administrativa de Sessões abriu com autenticação OWNER no servidor local reiniciado. O explorador legado de `CampaignFile(type=SESSION)` permaneceu visível e separado do painel novo. O painel exibiu o marcador `OWNER · privado`, o título `Sessões administrativas` e o estado de carregamento, sem expor identificadores ou conteúdo sensível.

Durante a primeira navegação houve um erro transitório de chunk ausente porque o build de produção havia substituído `.next` enquanto um servidor de desenvolvimento antigo permanecia ativo. O servidor foi encerrado e reiniciado; a rota passou a responder normalmente. O evento foi tratado como problema operacional do ciclo dev/build, não como falha do código Q08.

## Fluxo de planejamento

A fixture temporária foi criada pelo formulário OWNER e selecionada automaticamente. O acervo legado permaneceu separado, o estado vazio de objetivos/roteiro/checklist foi exibido e os controles de salvar, concluir e remover ficaram disponíveis.

A fixture recebeu título, data, resumo e resumo pós-sessão. O painel adicionou itens estruturados em Objetivos, Roteiro e Checklist, exibindo checkbox, campo de rótulo e remoção individual. O objetivo, o roteiro e o checklist foram preenchidos e permaneceram visíveis antes do salvamento.

A seleção de ficha existente apareceu como atalho local para o arquivo, comprovando referência sem duplicação. A UI também disponibilizou os seletores campaign-scoped para hipótese e vista administrativa.

O planejamento foi salvo com todos os campos estruturados e os três tipos de vínculo. A lista passou a exibir um objetivo e a mensagem `Planejamento salvo.`. Em seguida, a sessão foi concluída: a lista e o painel exibiram o status `Concluída`, o botão de conclusão deixou de aparecer e a mensagem confirmou que o planejamento continuava privado.

## Navegação administrativa local

O atalho `Destacar hipótese` abriu o Quadro de Investigação com a vista administrativa ativa e a hipótese selecionada no painel do Mestre. O uso do atalho alterou somente o estado local do quadro; não criou relações, não moveu fichas e não publicou o planejamento.

O Quadro confirmou a separação entre camadas canônicas e administrativas, exibiu os nós e relações oficiais existentes e manteve a restauração de vistas como operação local e reversível.

## Limpeza das fixtures

O planejamento temporário foi removido pela UI OWNER. A mensagem confirmou que nenhum `CampaignFile SESSION` foi alterado. A hipótese temporária foi removida pela ação administrativa do Quadro e o painel passou a mostrar nenhuma hipótese aberta.

A vista privada temporária foi removida pelo painel de vistas salvas. A confirmação final exibiu contador `0` e mensagem de nenhuma vista salva. O Quadro permaneceu com os recursos canônicos existentes, sem hipótese aberta ou vista temporária residual.

Uma primeira tentativa de remoção do planejamento expirou enquanto a janela de confirmação estava ativa; a existência da fixture foi verificada antes da repetição autorizada. Nenhuma credencial, URL de banco, identificador de campanha ou dado privado foi incluído nesta evidência.
