# Q03 — Overlay do grafo oficial de relações

**Status: APROVADO**  
**Marco entregue:** Q03  
**Pré-requisito:** Q02 aprovado, conforme `Q02_FILTROS_CAMADAS_RELATORIO.md` e `Q03_OVERLAY_GRAFO_OFICIAL_PROMPT.md`.

## 1. Decisão e escopo

O Q03 implementou exclusivamente no Quadro administrativo um overlay visual somente leitura para as relações oficiais retornadas por `relationshipsApi.graph`. A fonte permanece o grafo canônico servido por `relationshipService`; o cliente não cria uma nova fonte de verdade, não infere relações a partir de hipóteses/evidências e não altera a política de publicação.

As relações oficiais foram desenhadas como camada distinta dos `BoardEdge`: usam linha tracejada, marcador próprio para direção, rótulo com direção e tipo e seleção independente. Os fios visuais preservam o contrato original, aparência própria e ações de edição/exclusão separadas. Nenhuma relação ou aresta foi criada, atualizada ou removida durante a implementação ou a validação visual.

## 2. Entrega funcional

| Área | Implementação Q03 | Limite preservado |
|---|---|---|
| Fonte | `relationshipsApi.graph(campaignId)` e `filterOfficialRelationships` do Q02 | Nenhum payload alternativo ou inferência local |
| Direção | Seta `→` para tipo direcional e `↔` para tipo não direcional | Sem alteração do relacionamento persistido |
| Aparência | Linha tracejada, marcador e rótulo próprios | Não reutiliza a linguagem visual de `BoardEdge` |
| Filtros | Importância, visibilidade, escopo e camada oficial do Q02 | Filtros locais não criam nova consulta por busca |
| Seleção | Elemento focável com `role=button`, Enter/Espaço e clique | Seleção não abre edição nem mutação |
| Detalhes | Origem, destino, tipo, rótulo, descrição, importância e visibilidade | Painel declara somente leitura |
| Navegação | Ações separadas para abrir origem e destino | Navegação não altera a relação |
| Teclado | Escape global fecha a seleção; foco visível no overlay | Não captura drag/pan do canvas |
| Jogador/público | Nenhuma alteração em `PlayerInvestigationBoard` ou projeções | Overlay permanece administrativo |

## 3. Arquivos alterados

| Arquivo | Finalidade |
|---|---|
| `src/app/campaigns/[id]/investigacao/InvestigationBoardEditor.tsx` | Carrega relações oficiais, calcula geometria, desenha overlay, seleciona e exibe painel readonly |
| `src/app/campaigns/[id]/investigacao/page.module.css` | Aparência diferenciada, hit area, foco, painel, responsividade e reduced motion |
| `src/app/campaigns/[id]/investigacao/InvestigationFiltersPanel.tsx` | Legenda atualizada para indicar overlay readonly |
| `src/app/campaigns/[id]/investigacao/InvestigationBoardQ03.test.ts` | Testes contratuais de fonte, direção, separação, readonly e jogador |
| `src/app/campaigns/[id]/investigacao/InvestigationBoardQ02.test.ts` | Regresso ajustado para manter o contrato de camada canônica após Q03 |
| `todo.md` | Gate, plano, riscos e conclusão do marco |
| `Q03_BROWSER_FINDINGS.md` | Registro sanitizado da validação visual autenticada |
| `evidence/q03/q03-overlay-relacao-selecionada-anonimizado.webp` | Captura do overlay e painel readonly |
| `evidence/q03/q03-overlay-filtro-importante-anonimizado.webp` | Captura do filtro local aplicado ao overlay |

Não foram alterados `prisma/schema.prisma`, migrations, `relationshipService`, `publicationPolicy`, rotas de jogador/públicas, `package.json` ou lockfile.

## 4. Segurança e integridade

O endpoint administrativo existente continua responsável por escopo de campanha, visibilidade e exclusão de arquivos arquivados/lixeira no grafo. O serviço mantém a filtragem server-side por audiência e os nós ativos; o overlay apenas renderiza a projeção recebida e omite relações cujos endpoints não estão presentes no canvas atual, sem transformar essa ausência em exclusão canônica.

O painel readonly não importa ações de criação, atualização ou remoção de `Relationship`. As ações de escrita existentes no editor continuam restritas ao `BoardEdge` selecionado. O componente do jogador não consome `relationshipsApi.graph` nem classes do overlay. Nenhuma operação de banco foi realizada durante Q03.

## 5. Validação técnica

Todos os comandos locais padrão aplicáveis concluíram com sucesso.

| Verificação | Resultado |
|---|---|
| `pnpm exec prisma generate` | PASS |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| `pnpm exec next lint --dir src` | PASS |
| `pnpm exec vitest run --run` | **28 suítes / 183 testes PASS** |
| Suítes focadas Q03/Q02 | **4 suítes / 16 testes PASS** |
| `pnpm run build` | PASS |
| Captura autenticada administrativa | PASS, com evidências anonimizadas |

Os testes focados cobrem a fonte oficial, direção, aparência independente, painel readonly, Escape, links de origem/destino, ausência de mutações no overlay e isolamento do componente do jogador. A validação visual confirmou duas relações oficiais no estado padrão, redução para uma relação com o filtro `Importante`, remoção do overlay ao desligar a camada e restauração com `Limpar filtros`.

Não houve migration, conexão ou escrita de banco em Q03. O marco não alterou schema nem persistência; portanto não havia script PostgreSQL específico aplicável. As validações de banco dos marcos anteriores permanecem a referência de integridade do ambiente de teste.

## 6. Evidência visual

A rota administrativa foi aberta com sessão autenticada. A captura selecionada mostra o overlay tracejado sobre o quadro, o painel de detalhes readonly, origem/destino, tipo, importância, visibilidade e ações de abertura de arquivos. A captura filtrada mostra somente a relação compatível com `Importante` e o contador correspondente.

Os nomes e textos da campanha foram substituídos temporariamente no DOM apenas para as imagens compartilháveis. Nenhum evento de formulário foi disparado e nenhuma alteração foi persistida.

## 7. Riscos e limitações

O overlay posiciona relações somente quando origem e destino possuem nós no canvas atual. Relações válidas fora do recorte visual não são desenhadas naquela viewport, mas continuam pertencendo ao grafo canônico e ao contador filtrado. O overlay ainda não possui pins, grupos, vistas salvas, auto-layout, caminhos investigativos, diagnósticos ou edição inline; todos permanecem fora do Q03 e pertencem a marcos posteriores.

A geometria usa o posicionamento atual dos nós e uma curvatura visual fixa. Persistência de viewport, vistas e reorganização automática não fazem parte deste marco. O movimento de nós continua sendo a ação existente do quadro e não é alterado pelo overlay.

## 8. Rollback

O rollback é restrito aos arquivos do marco: remover o estado `selectedOfficialRelationshipId`, o carregamento/renderização do overlay, o painel readonly, os estilos `officialRelationship*`, o teste Q03 e as evidências Q03. O carregamento/filtro Q02, o canvas de `BoardEdge`, os serviços canônicos e o schema permanecem intactos. Como não houve migration nem escrita de banco, não há rollback de dados.

## 9. Aceite

O Q03 atende ao objetivo e aos critérios de aceite: fonte exclusivamente `Relationship`, distinção inequívoca de `BoardEdge`, direção/tipo/importância/visibilidade, seleção readonly e acessível, aplicação dos filtros Q02, isolamento do jogador/público, nenhuma criação ou edição automática e validação técnica/visual real. O marco está **APROVADO**.

O próximo marco é Q04 — Pins, notas e agrupamentos visuais do quadro. Sua implementação começa somente após o gate registrado no próximo prompt.

## Referências internas

[1]: ./Q03_OVERLAY_GRAFO_OFICIAL_PROMPT.md "Prompt de entrada de Q03"
[2]: ./Q02_FILTROS_CAMADAS_RELATORIO.md "Relatório aprovado de Q02"
[3]: ./Q03_BROWSER_FINDINGS.md "Achados visuais autenticados e anonimizados"
