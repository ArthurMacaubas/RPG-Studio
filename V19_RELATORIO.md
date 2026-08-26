# V19 — Visual Redesign, UX Polish & Design System

## Escopo concluído

A V19 concentrou-se exclusivamente em **interface, experiência de uso, responsividade e consistência visual**. A arquitetura existente foi preservada: App Router, TypeScript, CSS Modules, rotas, serviços, guards de acesso, APIs, Prisma, campanhas, Modo Jogador, Quadro de Investigação, relacionamentos e transferência JSON permanecem com os mesmos contratos e regras de negócio.

Não houve migration, alteração de schema, mudança de regras de audiência, modificação da V18, endpoint novo, persistência nova ou troca de fluxo funcional.

## Design system V19

O tema escuro passou a usar uma base de superfície mais organizada, sem dependência de gradientes amplos. Foram definidos tokens para fundo, superfícies, bordas, texto primário/secundário, estados semânticos, raios, espaçamento, tipografia, sombras e transições. Também foram mantidos aliases temporários para módulos legados, evitando regressões enquanto as superfícies prioritárias usam o vocabulário `--color-*`.

| Elemento | Aplicação V19 |
|---|---|
| Hierarquia | Títulos de produto em display, seções em headings compactos e metadados em mono/caption. |
| Superfícies | Fundo escuro, painéis delimitados, elevação discreta e contraste suficiente entre canvas, surface e surface elevated. |
| Interação | Hover moderado, foco visível, estado ativo compreensível, `:active` responsivo e respeito a redução de movimento. |
| Semântica | Cores de sucesso, aviso, perigo, informação e destaque são usadas de forma consistente em badges, compilador e feedbacks. |
| Responsividade | Sidebar vira drawer móvel, cabeçalho adapta-se, grades colapsam e ações não dependem de hover exclusivo. |

## Superfícies redesenhadas

| Área | Melhorias entregues |
|---|---|
| Navegação | Novo cabeçalho contextual por campanha, breadcrumbs compactos, indicação Mestre/Jogador, sidebar segmentada por área, favoritos mais legíveis e drawer em mobile. |
| Biblioteca | Barra de busca/filtros, seleção em massa, alternância de visualização, cards e linhas de lista com metadados, tags e ações rápidas mais claros. |
| Dashboard | Painel inicial com cabeçalho editorial, métricas, ações rápidas, coleção recente e distribuição por tipo. |
| Editor | Superfície principal de escrita, trilho lateral de metadados, status de autosave, ações segregadas, tags, comentários e histórico preservados. |
| Relacionamentos | `RelationshipManager` com direção, tipo, importância, audiência, campos e ações de edição/remoção visualmente hierarquizados. |
| Investigação | Quadro do Mestre e quadro do jogador com canvas, nós, fios, controles, empty state e inspector mais consistentes; nenhuma conexão ou regra de visibilidade foi alterada. |
| Sala de Sessão | Métricas, cronômetro, sessões em foco, checklist, combate e observabilidade receberam superfícies operacionais mais legíveis. |
| Transferência | Importação/exportação passou a comunicar etapas, opções, feedbacks de validação, erros, avisos e resumo de conteúdo com maior clareza. |
| Compilador | Métricas, severidades, sugestões e resultado de simulação ganharam separação visual e leitura mais direta. |
| Autenticação e modais | Login/cadastro, campos, modais, estados vazios, badges e botões foram alinhados ao mesmo sistema. |

## Arquivos visuais principais alterados

Os arquivos abrangem `src/styles/globals.css`, primitives em `src/components/ui/`, `Sidebar`, `CampaignHeader`, `FavoritesSection`, `FileExplorer`, `FileCard`, `FileListRow`, `RelationshipManager`, `PlayerInvestigationBoard`, `SessionCommandCenter`, `CampaignHealthWidget`, `Modal`, `AuthForm` e os módulos CSS das páginas de dashboard, editor, investigação e importação/exportação.

## Validação técnica

| Verificação | Resultado |
|---|---|
| `npm install` | Concluído; nenhuma dependência foi modificada. |
| `npx tsc --noEmit -p .` | Aprovado. |
| `npx next lint --dir src` | Aprovado sem avisos ou erros. |
| `npm test -- --run` | **9 arquivos e 54 testes aprovados**. |
| `npm run build` | Aprovado e todas as rotas foram geradas. |
| Revisão visual | A prévia local de `/login` foi renderizada e revisada após a atualização do tema e da tela de autenticação. |

## Limitações e avisos conhecidos

O `prisma validate` não pôde validar a conexão configurada porque o `DATABASE_URL` ativo neste ambiente ainda não possui protocolo PostgreSQL válido (`P1012`). Isso não bloqueou TypeScript, lint, testes unitários ou build e a V19 não executou migration, reset ou alteração no banco.

O build exibe os avisos conhecidos de uso dinâmico de `cookies` nas rotas de autenticação e convites durante a análise estática; as rotas continuam dinâmicas conforme esperado. O `npm install` também mantém o aviso pré-existente de 6 vulnerabilidades de alta severidade em dependências. Nenhum `npm audit fix` foi executado para evitar atualização de pacote não revisada e fora do escopo.

## Status

**V19 PRONTA**

Aguardo a próxima instrução antes de iniciar qualquer versão funcional nova.
