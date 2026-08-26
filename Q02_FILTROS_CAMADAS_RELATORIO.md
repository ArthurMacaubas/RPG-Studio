# Q02 — Filtros, busca e camadas de investigação

**Status: APROVADO**  
**Marco entregue:** Q02  
**Data da validação:** 25 de agosto de 2026  
**Pré-requisito:** Q01.1 aprovado, conforme o relatório de integração do painel administrativo.[1]

## 1. Decisão e escopo

O Q02 foi concluído como uma evolução exclusivamente administrativa e local do Quadro de Investigação. A solução adiciona navegação reversível por busca, tipo, tags, escopo de arquivo, favoritas, importância, visibilidade, estado de hipótese e stance de evidência, sem persistir filtros, sem alterar a política de publicação e sem criar novas rotas, migrations ou contratos de escrita.

A separação semântica foi preservada. **CampaignFile** continua sendo a fonte das fichas e seus metadados; **BoardEdge** continua sendo o fio visual persistido do quadro; **Relationship** continua sendo a relação oficial canônica, consultada para contagem e filtragem; e hipóteses/evidências permanecem no painel administrativo como raciocínio do Mestre. Nenhuma evidência cria ou edita Relationship ou BoardEdge. O overlay visual interativo das relações oficiais não foi antecipado: no Q02 há somente consulta, filtros, contagem e legenda de camada. Esse limite prepara o Q03 sem executá-lo.

## 2. Entrega funcional

| Área | Implementação Q02 | Comportamento e limite |
|---|---|---|
| Busca de fichas | Busca local no editor por nome, descrição, conteúdo e JSON de identificação | Não dispara requisição por tecla; é reversível e atua somente sobre os nós carregados |
| Filtros de fichas | Tipo, tags, ativas/arquivadas/lixeira e somente favoritas | Combináveis; o escopo de arquivo usa `filesApi.list` quando realmente muda |
| Relações oficiais | Importância e visibilidade com contagem filtrada | Usa `relationshipsApi.graph` como fonte canônica; não desenha overlay no canvas |
| Hipóteses | Estado e busca local de título/resumo no painel existente | O filtro de estado é controlado pelo host administrativo |
| Evidências | Stance no painel e destaque temporário condicionado à camada | A camada controla o destaque visual; o domínio de evidência não é misturado ao grafo |
| Arestas visuais | Exibição condicionada à camada e aos dois endpoints visíveis | Continua usando o contrato de `BoardEdge`; não é convertido em Relationship |
| Camadas | Fichas, relações oficiais, arestas visuais, evidências e hipóteses | Checkboxes keyboard-accessible, locais e não persistidos |
| Estados vazios | Canvas sem nós, filtro sem correspondência e camada de fichas desligada | Cada estado explica a causa; o filtro sem correspondência oferece `Limpar filtros` |
| Jogador/público | Nenhum painel administrativo importado | A rota de jogador continua sem hipóteses, evidências administrativas ou filtros do Mestre |

## 3. Arquivos alterados

| Arquivo | Finalidade |
|---|---|
| `src/app/campaigns/[id]/investigacao/InvestigationBoardEditor.tsx` | Integra o estado local, carregamento administrativo, filtros, camadas, contadores e estados vazios; mantém o canvas visual separado do overlay oficial |
| `src/app/campaigns/[id]/investigacao/InvestigationFiltersPanel.tsx` | Painel de busca, filtros combináveis, legenda e contagem da camada canônica |
| `src/app/campaigns/[id]/investigacao/investigationFilters.module.css` | Estilos do painel Q02 |
| `src/app/campaigns/[id]/investigacao/investigationBoardFilterLogic.ts` | Funções puras para fichas, arestas visuais e relações oficiais |
| `src/app/campaigns/[id]/investigacao/investigationBoardFilterLogic.test.ts` | Testes puros de tipo, tags, escopo, favoritas, busca, reversibilidade, arestas e relações |
| `src/app/campaigns/[id]/investigacao/InvestigationBoardQ02.test.ts` | Regressões de camadas, host administrativo, ausência de chamadas por busca, rota do jogador e limite Q02/Q03 |
| `src/app/campaigns/[id]/investigacao/InvestigationBoardIntegration.test.ts` | Expectativa atualizada para permitir a leitura canônica de relações e continuar proibindo criação indevida a partir de evidências |
| `src/app/campaigns/[id]/investigacao/page.module.css` | Estilo de foco e ação do estado vazio |
| `todo.md` | Registro do marco, validações e decisão de não executar banco |

Não foram alterados `prisma/schema.prisma`, migrations, serviços de domínio, `publicationPolicy`, rotas de jogador/públicas, `package.json` ou lockfile.

## 4. Validação técnica

A validação final foi executada após a correção da pluralização do contador de relações. Todos os comandos abaixo concluíram com sucesso.

| Verificação | Resultado |
|---|---|
| `pnpm exec prisma generate` | PASS |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| `pnpm exec next lint --dir src` | PASS |
| `pnpm exec vitest run --run` | **27 suítes / 179 testes PASS** |
| `pnpm run build` | PASS; rota administrativa compilada |
| Suítes focadas Q02 | **3 suítes / 12 testes PASS** |

Os testes puros verificam a combinação e reversibilidade de filtros, busca em campos de identificação, escopo, tags e favoritas, filtragem de arestas somente entre nós visíveis, importância/visibilidade de relações oficiais e desligamento de camadas. Os testes estáticos verificam o host administrativo, a ausência de filtros no componente do jogador, a ausência de overlay oficial no Q02 e a ausência de dependência da busca local para novas consultas.

Não houve migration, conexão, escrita ou alteração de banco no Q02. O marco não introduziu schema nem comportamento de persistência; por isso não havia script PostgreSQL aplicável a reexecutar. As validações de banco do Q01.1 permanecem a referência do pré-requisito, e não foram repetidas nem ampliadas nesta entrega.[1]

## 5. Validação visual administrativa

A rota administrativa foi aberta com sessão autenticada no servidor local. Após reiniciar o servidor de desenvolvimento para eliminar assets CSS antigos, a captura exibiu o painel com busca, filtros de escopo, tags, relações oficiais, hipóteses/evidências e as cinco camadas. O canvas mostrou os nós existentes e o contador canônico de relações, sem overlay oficial.

Uma busca local sem correspondência produziu `1 filtro ativo`, `0 nós no canvas`, a mensagem explicativa `Nenhuma ficha corresponde aos filtros atuais` e a ação `Limpar filtros`. A ação restaurou `Nenhum filtro ativo` e os nós do canvas. O desligamento temporário da camada de fichas mostrou a mensagem específica para reativá-la. As imagens compartilhadas foram anonimizadas somente no DOM para retirar nomes da campanha; essa alteração não foi persistida.

As evidências visuais incluídas no pacote são:

| Evidência | Conteúdo |
|---|---|
| `evidence/q02/q02-painel-anonimizado-estado-padrao.webp` | Painel Q02 aberto, camadas e estado padrão anonimizados |
| `evidence/q02/q02-anonimizado-busca-sem-correspondencia.webp` | Busca local aplicada, estado vazio e ação de limpeza |

## 6. Riscos e limitações conhecidas

O filtro atua sobre os nós e arquivos já carregados pelo contexto administrativo. A troca de escopo solicita a lista correspondente; busca, tipo, tags e favoritas são locais. Se um payload futuro não trouxer uma ficha ou relação, a interface não deve interpretar essa ausência como inexistência canônica; o painel comunica o escopo carregado e mantém a fonte oficial separada.

A camada de relações oficiais ainda não tem desenho, seleção, pins, vistas ou interação no canvas. Esses itens permanecem explicitamente fora do Q02. Também não foram introduzidos auto-layout, diagnósticos, sessões, briefing de jogador, rate-limit, storage ou backup center.

O ambiente de desenvolvimento utilizado para a captura foi reiniciado após o build porque o processo anterior mantinha referências antigas de CSS. O servidor de desenvolvimento não faz parte do pacote final; o tar.gz exclui `.next`, logs, dependências e arquivos de ambiente.

## 7. Aceite

O Q02 atende ao marco selecionado: filtros administrativos combináveis e reversíveis, busca local, camadas distinguíveis, estados vazios acessíveis, preservação dos contratos CampaignFile/Relationship/BoardEdge/evidência/hipótese, ausência de migration e nenhuma antecipação do overlay oficial. O marco está **aprovado para entrega**. O próximo marco é apenas documentado no arquivo `Q03_OVERLAY_GRAFO_OFICIAL_PROMPT.md`; sua implementação não foi iniciada.

## Referências internas

[1]: ./QUADRO_01_1_INTEGRACAO_PAINEL_RELATORIO.md "Relatório aprovado de Q01.1"
