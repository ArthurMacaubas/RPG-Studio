# QUADRO 03 — Evidência de validação browser

## Estado intermediário

Em 27/08/2026, a produção autenticada foi aberta com uma campanha sintética existente e papel **OWNER**. A página administrativa de sessões carregou o planejamento Q08 e confirmou uma sessão de teste com fichas vinculadas, hipóteses e vistas disponíveis. A versão ainda exibida nesse momento era o deployment anterior, portanto o painel novo ainda não foi usado nessa evidência.

O push do commit funcional do QUADRO 03 foi acionado e o dashboard da Vercel mostrou o deployment novo em estado **Building**. A validação funcional do novo painel será repetida após o deployment atingir **Ready**.

Nenhuma campanha, sessão, ficha, hipótese, relação, vista ou vínculo foi criado, editado, removido ou publicado durante essa etapa.

## Deployment confirmado

O deployment Production do commit `11071f3` atingiu **Ready** na Vercel e foi associado ao domínio de produção existente. A validação funcional da versão publicada pode prosseguir na mesma campanha sintética OWNER.

## Tela Q03 publicada

A página `/campaigns/:id/sessoes` carregou o painel **Contexto investigativo da sessão** com o selo **OWNER · privado**. A sessão sintética selecionada mostrou data/status, sessão anterior vazia de forma neutra, uma pendência de checklist, resumo de preparação, três fichas vinculadas e duas relações oficiais relevantes entre essas fichas. Hipóteses e vistas sem vínculo foram exibidas como estados vazios orientativos.

Os links apresentados foram **Abrir ficha**, **Focar no quadro** e o botão **Retomar planejamento**. Nenhuma ação de mutação foi acionada.

O botão **Recolher** foi acionado e o painel passou para o estado **Expandir**, mantendo o restante do planejamento intacto. A ação foi local e não gerou escrita.

O atalho **Focar no quadro** navegou para a superfície `/campaigns/:id/investigacao` com `fileId` efêmero. Após a hidratação, o quadro exibiu três nós visíveis e o status **Ficha focada no quadro**, com a mensagem de que o foco é transitório e não altera o canvas. Nenhum recurso foi mutado.

Um `fileId` com espaço foi testado na URL do quadro; a página carregou o estado neutro, sem foco, erro sensível ou tentativa de leitura inválida. A tentativa de abrir a rota de investigação do jogador com a sessão OWNER foi redirecionada pelo guard existente para o quadro administrativo, sem importar o painel Q03 para a superfície de jogador.

O deployment funcional do QUADRO 03 e os deployments documentais subsequentes foram acompanhados no projeto Vercel existente. A versão documental final terminou em **Ready**, manteve o domínio de produção e não reportou falha de build. O deployment funcional anterior `11071f3` também permaneceu **Ready**.
