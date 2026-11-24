# Grafo de Relações e Compilador V6

## Entrega

Esta mudança adiciona o controle opcional do Compilador V6 no dashboard e uma página dedicada em `/campaigns/[id]/grafo`. O Quadro de Investigação permanece separado e continua usando suas próprias entidades visuais.

## Arquivos criados e alterados

- `src/components/CampaignHealthWidget.tsx` e `.module.css`: estado recolhido por padrão, preferência por campanha em `localStorage`, carregamento de saúde somente ao abrir e preservação da simulação.
- `src/services/campaignDashboardService.ts`: o dashboard não calcula o diagnóstico V6 enquanto o widget está recolhido.
- `src/app/campaigns/[id]/grafo/page.tsx` e `RelationshipGraphEditor.tsx/.module.css`: página responsiva, canvas SVG com pan, zoom, arraste, filtros, foco por vizinhança, centralização, auto-layout, tela cheia, seleção de nós/conexões e edição.
- `src/lib/relationshipGraph.ts` e `.test.ts`: chave isolada de posições, filtros e auto-layout determinístico.
- `src/lib/api.ts` e `src/types/index.ts`: contrato tipado do grafo oficial.
- `src/components/Sidebar.tsx`: navegação `Grafo de Relações` para Mestres.
- `docs/FEATURES.md`, `CHANGELOG.md` e este relatório: documentação da entrega.

## Decisões arquiteturais

- A fonte de verdade é `relationshipService.getGraph()` e as operações usam `relationshipsApi.create/update/remove`; `BoardEdge` não é consultado nem alterado.
- O canvas usa SVG nativo para não adicionar dependência ao projeto. A estrutura permite substituir o renderer por `@xyflow/react` no futuro sem alterar os contratos de dados.
- Posições são apenas preferência de interface e ficam em `localStorage` com chave composta por usuário e campanha. O auto-layout só altera posições, nunca relacionamentos.
- O backend já seleciona apenas ID, nome e tipo dos arquivos do grafo, além de aplicar visibilidade, audiência, grants e modo de jogador antes de responder.

## Permissões e limitações

A página é exposta na navegação administrativa e exige acesso de Mestre; o backend continua sendo a autoridade para escopo, tipos válidos, duplicações, direção, visibilidade e alterações. O endpoint oficial mantém suporte a leituras filtradas de jogadores, mas esta primeira interface não publica uma entrada de jogador.

As posições ainda não sincronizam entre dispositivos e o renderer SVG não possui virtualização específica para milhares de nós. Para centenas de entidades, filtros, foco por vizinhança e seleção reduzem o conteúdo renderizado; uma evolução futura pode adotar virtualização ou `@xyflow/react`.

## Dependências

Nenhuma dependência nova foi adicionada.

## Validação

- `npx tsc --noEmit`: passou sem erros.
- `npm test -- --run src/lib/relationshipGraph.test.ts`: 4 testes passaram.
- ESLint dos arquivos alterados da entrega: passou.
- `npm run test:run`: 53 arquivos e 308 testes passaram.
- `npm run prisma:format`: passou. `npm run prisma:validate` ficou bloqueado porque o ambiente não define `DATABASE_URL_UNPOOLED`.
- `npm run build`: compilação, lint e checagem de tipos passaram; a etapa final falhou com `ENOENT` para `.next/server/pages-manifest.json`, acompanhada de avisos de uso dinâmico já existentes nas rotas autenticadas.

## Próximas melhorias

- Disponibilizar uma visualização somente leitura para jogadores quando o produto definir sua entrada de navegação.
- Persistir posições no servidor se a experiência precisar acompanhar o Mestre entre dispositivos.
- Adotar renderer especializado/virtualização caso campanhas muito grandes demonstrem necessidade medida.
