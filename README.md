# RPG Campaign Studio

Software profissional para criação, organização e execução de campanhas de RPG.
Next.js (App Router) + TypeScript + CSS Modules no frontend, Node.js + Prisma +
PostgreSQL no backend.

O escopo pedido é grande demais para uma única entrega. **V1** trouxe a
arquitetura completa. **V2** implementou o módulo de Arquivos por completo.
**V3** implementou os sistemas de RPG na ficha de NPC/Personagem, checklist
de sessão e anexos por URL. **V4** implementou Timeline, Quadro de
Investigação e Modo Jogador. **V5** implementou a transferência completa de campanhas em JSON, backup,
Markdown e PDF. **V6** adicionou o Compilador com simulação do grafo. **V7**
implementa autenticação própria por e-mail e senha, sessões persistidas, convites
e papéis de Mestre/jogador por campanha. **V8** adicionou o design system, fichas adaptativas e a biblioteca pública do jogador. **V9** adiciona editores persistentes de ficha, upload e galeria de imagens, busca global, rolagens contextuais e compartilhamento autenticado.

## Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL para seu PostgreSQL/Neon
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Abra http://localhost:3000. Se `npx prisma generate` falhar por causa de
`binaries.prisma.sh` (bloqueado em alguns ambientes de rede restrita), rode
em uma rede sem essa restrição — é só para baixar os engines do Prisma, o
schema em si não muda.

## V14 — Segurança de acesso e consistência de visibilidade

A V14 reforça os fluxos de autenticação e convites sem substituir a
autenticação própria ou a regra de autorização existente. Login, registro e
aceite de convite recebem rate limiting em memória por IP e, quando disponível,
por e-mail. Após cinco falhas no intervalo de 15 minutos, há bloqueio temporário
progressivo; respostas bloqueadas usam `429`, `Retry-After` e `Cache-Control:
no-store`. Para implantação com múltiplas réplicas, substitua esse mecanismo
local por um armazenamento compartilhado, como Redis ou Upstash.

O `middleware.ts` aplica CSP compatível com os assets locais e os anexos em data
URL, além de `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy`, isolamento de opener e HSTS em
produção. A prévia "Ver como jogador" foi coberta por teste de regressão e
mantém o filtro de servidor de publicação e grants, mesmo quando o Modo Jogador
está pausado. A resolução da pasta padrão de favoritos agora devolve um ID
tipado antes da adição do arquivo.

Não há migration nesta versão. Consulte `V14_RELATORIO.md` para os detalhes e
para a limitação atual de validação do Neon neste ambiente.

## V15 — Combate e ameaças

A V15 adiciona `THREAT` ao conteúdo polimórfico da campanha e reutiliza a ficha
adaptativa de personagem para registrar atributos, vitais, perícias e ações de
uma ameaça. A navegação inclui a categoria **Ameaças**, e a Sala de Sessão
passa a concentrar a criação e a operação de encontros persistentes.

O schema recebeu `CombatEncounter` e `CombatParticipant`, com vínculo opcional
à `Session`, estado `NOT_STARTED`/`IN_PROGRESS`/`ENDED`, rodada, turno,
iniciativa, HP, condições e controle individual de visibilidade. A migration
`20260820024711_add_combat_encounters` foi aplicada e confirmada no Neon antes
da implementação dos serviços e da interface.

O jogador autenticado vê a iniciativa de participantes liberados durante um
encontro em andamento, mas HP e condições ficam disponíveis apenas na própria
ficha, desde que a mesma passe pelo filtro existente de publicação/grant. HP de
ameaças não é exposto.

O rate limiter agora ignora headers de proxy por padrão. Defina
`TRUST_PROXY_HEADERS="true"` apenas atrás de uma infraestrutura confiável que
sobrescreva `x-forwarded-for`/`x-real-ip`; a V15 também limita quantas origens
distintas podem tentar o mesmo e-mail dentro da janela de proteção. Consulte
`V15_RELATORIO.md` para o desenho completo e as limitações de escalabilidade.

## V16 — Core investigativo de relacionamentos

A V16 transforma o enum fechado de relações em um domínio extensível. O
`Relationship` continua sendo a fonte oficial de verdade entre dois arquivos,
agora com campanha explícita, tipo configurável, descrição, importância,
visibilidade e atualização. `RelationshipType` oferece os tipos globais
preservados e tipos personalizados por campanha; a direção permanece definida
por `fromId` e `toId`.

A migration `20260821192014_relationship_core_extensible` foi aplicada ao Neon
de modo aditivo, preservando relacionamentos legados. O campo `kind` continua
disponível apenas como compatibilidade de importação/exportação enquanto os
novos fluxos usam `typeId`. O editor usa `RelationshipManager`, o Compilador
consome nomes de tipos extensíveis, o JSON preserva metadados e o Modo Jogador
recebe apenas relações `ALL` entre arquivos já visíveis ao usuário.

O Quadro de Investigação continua separado: `BoardEdge` é uma conexão visual e
não cria ou altera relacionamentos oficiais. Consulte `V16_CORE_RELATIONSHIPS.md`
e `V16_RELATIONSHIP_DESIGN.md` para as decisões, a migration e os limites
deliberados desta entrega.

## V17 — Integridade e segurança de relacionamentos

A V17 fortalece o core investigativo sem iniciar Revelações, Dependências ou
um novo motor de investigação. `RelationshipVisibility` agora aceita `GM`,
`ALL` e as audiências `P1`–`P4`; membros recebem um slot opcional e único por
campanha na tela existente de Convites. Mestre vê todas as relações; cada
jogador recebe apenas `ALL` e a própria audiência.

O filtro acontece exclusivamente no backend e exige que origem e destino sejam
visíveis, publicados, ativos e liberados por grant quando aplicável. `get()`,
`getForEntity()`, `getGraph()` e `listForPlayer()` compartilham a mesma política.
A migration `20260822115559_relationship_integrity_security` adicionou a
unicidade por campanha, origem, destino e tipo após auditoria sem duplicações
no Neon.

O JSON passa a exportar IDs de relações e tipos, escopo de tipo, metadados e
visibilidade individual. A importação padrão continua remapeando IDs para uma
nova campanha e prevê um modo futuro de restauração. Consulte
`V17_RELATORIO.md` e `V17_AUDITORIA_RELATIONSHIP_INTEGRITY.md` para o relatório
completo e o diagnóstico de compatibilidade.

## V20.4 — Fechamento documental do hardening HTTP

O Marco 1 da V20.4 blindou o contrato público de erros HTTP. `PublicApiError`
é o único caminho para uma mensagem de domínio explicitamente pública; erros
comuns que apenas possuem `status` recebem mensagens neutras e códigos estáveis,
sem ecoar nomes, IDs, stack ou contexto privado. A importação também deixou de
serializar mensagens e detalhes internos de validação.

A V20.4.1 corrigiu a construção tipada de `PrismaClientKnownRequestError` no
teste, adicionando um `clientVersion` sintético compatível com o Prisma 5.22.0.
A validação final aprovou Prisma generate/format/validate, TypeScript, lint,
**19 arquivos de teste / 146 testes** e build. Não houve migration, operação de
banco ou alteração de dados. Os testes PostgreSQL reais permanecem pendentes de
uma base de teste isolada. Consulte `V20_4_RELATORIO.md` para o fechamento
completo e as limitações.

## V5 — Importação e Exportação (entrega anterior)

A V5 adiciona a tela `/campaigns/[id]/importar-exportar`, acessível pela
sidebar, com exportação em quatro formatos e importação segura de campanhas.

- **JSON oficial** — snapshot versionado (`format: rpg-campaign-studio`,
  `version: 1`) com metadados da campanha, sistema personalizado, arquivos,
  tags, anexos, comentários, histórico, relacionamentos, favoritos, sessões,
  timeline, quadro e visibilidades do Modo Jogador.
- **Backup completo** — a mesma estrutura JSON com nome de arquivo próprio,
  adequada para restauração e arquivamento.
- **Markdown** — relatório legível com arquivos, dados específicos,
  relacionamentos, sessões, timeline e quadro de investigação.
- **PDF** — relatório paginado gerado no servidor.
- **Importação validada** — o JSON é lido, enviado ao endpoint de validação e
  só pode ser importado quando a estrutura, IDs e referências estiverem
  consistentes. A criação da nova campanha ocorre em uma transação e todos os
  relacionamentos são remapeados para os novos IDs.
- **Template JSON** — a página `/campaigns/[id]/documentacao-json` documenta
  os campos e inclui um exemplo mínimo completo para campanhas geradas por IA.

As rotas da V5 são `/api/campaigns/[id]/export`,
`/api/campaigns/import/validate` e `/api/campaigns/import`. Nenhuma rota
acessa o Prisma diretamente: toda a persistência passa por
`campaignTransferService`.

**Hardening aplicado nesta etapa:** o serviço de relacionamentos passou a validar
IDs, mesma campanha, auto-relacionamentos, tipos e duplicações; o quadro passou a
validar campanha, nós, coordenadas e conexões; rotas de domínio agora convertem
404/409/422 e falhas do Prisma para respostas estáveis. A autenticação própria
entregue na V7 agora protege o uso público com sessões e guards de campanha.

## V7 — Autenticação própria, sessões e convites

O Studio agora usa autenticação própria, sem OAuth, NextAuth, JWT externo ou
provedores de terceiros. O cadastro (`/registro`) e o login (`/login`) recebem
e-mail e senha; a senha é armazenada como hash `scrypt`, nunca em texto puro.
Após o login, o servidor cria uma sessão persistida em `AuthSession` e grava
somente o token em cookie HTTP-only `rpg_campaign_session`; no banco fica apenas
o hash SHA-256 do token. O logout invalida a sessão no banco e remove o cookie.

O usuário autenticado é automaticamente o **Mestre (OWNER)** de campanhas que
criar. O acesso a campanhas compartilhadas é concedido por `CampaignMember`,
sempre com papel **PLAYER**. Jogadores podem ler os dados permitidos pela
campanha, mas mutações de domínio passam pelos guards centralizados em
`src/lib/access.ts` e são bloqueadas com `403` quando o papel não é OWNER.

O Mestre envia convites por e-mail em `/campaigns/[id]/convites`. A tela gera um
link com token aleatório de 32 bytes, o servidor armazena somente seu hash, e o
convite expira por padrão em 14 dias (limite de 30). A prévia pública fica em
`/convites/[token]`; o aceite exige sessão com o mesmo e-mail convidado e cria a
membership PLAYER. Convites recebidos também ficam disponíveis em `/convites`.

As mudanças de banco estão divididas em `prisma/migrations/0001_initial` e
`prisma/migrations/0002_add_auth_invites_members`. Em ambiente com `DATABASE_URL`
configurada para o Neon, execute `npm run prisma:migrate:deploy`. A migration
incremental adiciona `User.passwordHash`, `User.updatedAt`, `AuthSession`,
`CampaignMember`, `CampaignInvite` e os enums de status/papel.

A camada `src/lib/api.ts` é o único ponto de acesso HTTP usado pelos componentes.
As rotas API delegam para serviços, e os serviços delegam para o Prisma. O
comando `npm run db:smoke` faz apenas `SELECT 1` e contagens de leitura; não cria,
altera ou apaga dados. Os scripts `prisma:validate`, `prisma:format`,
`prisma:migrate:deploy`, `db:smoke`, `test:run` e `test:roundtrip` tornam a
validação repetível. O round-trip V5 preserva `authorId` e remapeia IDs de
sistemas personalizados durante a importação.

## V9 — Fichas persistentes, imagens e leitura autenticada

A V9 adiciona ferramentas de preparação e leitura sem exigir uma tabela nova para cada sistema: habilidades e inventário continuam versionados no campo JSON da ficha e agora são editáveis individualmente.

- **Habilidades**: nome, descrição, usos e reordenação por controles acessíveis. A organização muda conforme Ordem Paranormal, D&D 5e ou o sistema personalizado.
- **Inventário**: nome, descrição, quantidade e reordenação, com persistência no auto-save do arquivo.
- **Rolagens contextuais**: o botão de dado aparece nas perícias de Ordem Paranormal e D&D 5e e retorna um resultado anunciado por `aria-live`.
- **Imagens**: `AttachmentsPanel` permite colar URL ou enviar PNG, JPEG, GIF, WebP e SVG de até 5 MB. Os uploads são convertidos em data URL e armazenados como anexos, sem código Prisma nos componentes. O painel de edição mostra miniaturas para personagens, NPCs, locais e mapas; o Modo Jogador também mostra capas e galerias de imagens publicadas.
- **Busca global**: `/api/search` pesquisa campanhas, arquivos, pistas, NPCs, locais, eventos e demais tipos pelo nome, descrição ou conteúdo, respeitando proprietário e membros da campanha.
- **Compartilhamento autenticado**: `/campaigns/[id]/jogador` exibe a publicação para uma sessão autenticada, complementando o link público `/jogador/[shareSlug]`.
- **Quadro avançado**: conexões usam curvas Bézier, rótulo padrão sempre visível, controle de curvatura de -180 a 180 e atalhos Esc/Delete. A migration `0003_board_edge_curve` adiciona `BoardEdge.curve` com default zero para dados existentes.

Para o deploy, execute `npx prisma migrate deploy` com `DATABASE_URL` configurada. A V9 não substitui armazenamento de objetos: uploads grandes, vídeos e documentos devem continuar usando URLs de storage externo até que um bucket S3/R2 seja configurado.

## V8 — Design system, fichas adaptativas e experiência de jogador

A V8 evolui a experiência visual e operacional sem trocar a arquitetura Next.js + TypeScript + CSS Modules.

- **Design system reutilizável** em `src/components/ui`: `Button`, `Input`, `Badge`, `Panel`, `EmptyState`, `Skeleton`, `ToastProvider` e `CommandPalette`. Os componentes centralizam estados de foco, loading, semântica e feedback.
- **Quadro de Investigação**: conexões renderizadas como fios SVG com seta, contraste, hit area de seleção e feedback de criação/falha via Toast. O relacionamento visual continua separado do grafo oficial do Compilador.
- **Fichas adaptativas**: Ordem Paranormal recebe uma organização de agente com abas de visão geral, perícias, poderes/rituais, inventário e notas; D&D 5e apresenta atributos base, HP, CA, iniciativa, deslocamento e proficiência; sistema personalizado usa os campos criados pelo Mestre e mantém extensões de inventário/habilidades.
- **Modo Mestre**: publicação com busca, filtro por tipo, somente publicados, seleção em lote, contadores, status publicado/pausado, link copiável e prévia.
- **Tela pública do jogador**: biblioteca por categorias, pesquisa textual, filtros, tags, cards de leitura e painel de detalhe sem edição.
- **Dashboard**: indicação do papel OWNER/PLAYER, saudação contextual e atalhos operacionais.
- **Navegação e acessibilidade**: drawer mobile real para a Sidebar, overlay de fechamento, foco visível e atributos ARIA reforçados nos Favoritos.
- **Identidade**: Skeletons, Toasts globais, busca Ctrl/Cmd+K e favicon vetorial em `public/icon.svg`.

A referência conceitual usada para a organização da ficha de Ordem Paranormal foi o C.R.I.S. público, especialmente a ideia de acesso rápido a atributos e perícias. A implementação não copia marca, assets ou textos externos.

## V6 — Compilador e simulação do grafo (primeira entrega)

A V6 inicial amplia o Compilador sem alterar dados: a análise agora verifica
arquivos órfãos, puzzles sem solução, pistas/documentos/NPCs/locais sem uso,
puzzles sem pistas, sessões vazias, timeline inconsistente e referências de
arquivos quebradas dentro de `data`.

O Compilador também constrói o grafo oficial de `Relationship`, identifica pontos
de entrada e finais explícitos (`data.isStart`, `data.isFinal`) ou inferidos,
percorre os caminhos, detecta becos sem saída, ciclos e nós bloqueados
(`data.blocked`/`data.isBlocked`) e apresenta o caminho encontrado. O quadro
`BoardNode`/`BoardEdge` é analisado separadamente para não confundir hipótese
visual com relacionamento oficial.

No dashboard, o widget passou a exibir **Compilador V6** e o botão **Simular
Grafo**, que chama a rota não destrutiva `/api/campaigns/[id]/health/simulate`.
Os testes puros do simulador cobrem caminho válido, beco sem saída, nó bloqueado
e ciclo.

**Próximas expansões:** planejamento dedicado de sessões usando o modelo
`Session`, upload real de anexos e regras completas e parametrizadas de Ordem
Paranormal/D&D 5e.

## V4 — Timeline, Quadro de Investigação e Modo Jogador (entrega anterior)

- **Timeline** (`/timeline`) — linha do tempo cronológica de eventos da
  campanha, cada um opcionalmente ligado a um arquivo (NPC, documento,
  etc.); criar/editar/excluir pela interface.
- **Quadro de Investigação** (`/investigacao`) — mural infinito: pan
  (arrastar o fundo) e zoom (scroll), arraste livre dos cards, botão
  "Adicionar" para trazer qualquer arquivo da campanha para o quadro,
  modo "Conectar" para desenhar linhas entre dois cards, e um painel para
  nomear, colorir e descrever cada conexão. Duplo clique num card abre o
  arquivo no editor.
- **Modo Jogador** (`/modo-jogador`, tela do Mestre) — liga/desliga o modo,
  gera um link público (`/jogador/[shareSlug]`) e lista todos os arquivos
  da campanha com uma checkbox de visibilidade por item. Só o que está
  marcado aparece para os jogadores.
- **Tela pública do jogador** (`/jogador/[shareSlug]`, fora do layout do
  Mestre — sem sidebar, sem controles de edição) — mostra só os arquivos
  liberados, em cards; clicar abre nome/descrição/conteúdo em modo leitura.
  Fica inacessível automaticamente se o Mestre desligar o Modo Jogador.

Validado com `npm install`, `tsc --noEmit` e `next lint` reais — sem erros
de lógica; o único ruído são os tipos do Prisma Client não gerado neste
sandbox (rede restrita para `binaries.prisma.sh`).

**Não implementado naquela etapa:** Compilador com novas regras, Importação/
Exportação, upload real de anexos e tela dedicada de planejamento de sessões
usando o modelo `Session`. Esses pontos foram separados para as versões
seguintes; a Importação/Exportação foi entregue na V5 e a autenticação na V7.

## V1–V3 — Fundamentos, Arquivos, Sistemas de RPG (entregas anteriores)

- **Ficha dinâmica** (`CharacterSheet`) — aparece automaticamente no editor
  para arquivos do tipo NPC e Personagem. Para Ordem Paranormal e D&D 5e,
  usa fichas prontas (`src/lib/systemPresets.ts`: atributos, PV/PE/Sanidade
  ou STR–CHA/HP/CA, e a lista de perícias do sistema). Para campanhas com
  sistema Personalizado, a ficha é gerada a partir do que o Mestre configurou
  em `/configuracoes` (veja abaixo) — mesmo componente, mesma lógica de
  renderização, só muda a origem dos campos.
- **Builder de Sistema Personalizado** (`/configuracoes`, visível só quando
  `campaign.system === 'CUSTOM'`) — criar/excluir atributos (nome, sigla,
  min/máx), perícias, classes e raças. Tudo isso alimenta a ficha acima.
- **Checklist de sessão** — arquivos do tipo Sessão ganham um painel de
  checklist (adicionar/marcar/renomear/remover item, com barra de
  progresso) direto no editor, salvo em `data.checklist`. O modelo `Session`
  dedicado do schema (com seu próprio campo `checklist`) fica reservado
  para quando a tela de planejamento de sessões (V4) precisar de mais
  estrutura do que um arquivo sozinho oferece.
- **Anexos** — painel "Anexar por URL" no editor (nome opcional + link);
  upload real de arquivo (blob storage) seguem para V4, como já estava no
  roadmap.

**Não implementado nesta etapa:** Quadro de Investigação, Compilador (o
widget do V1 segue no ar sem novas regras), Modo Jogador, Importação/
Exportação, upload real de anexos, tela dedicada de planejamento de
sessões usando o modelo `Session`.

Validado com `npm install`, `tsc --noEmit` e `next lint` reais — sem erros
de lógica; o único ruído seguem sendo os tipos do Prisma Client não gerado
neste sandbox (rede restrita para `binaries.prisma.sh`).

## V1/V2 — Fundamentos e módulo de Arquivos (entregas anteriores)

**Backend**
- `fileService` — CRUD completo, duplicar, mover para favoritos, arquivar/
  restaurar, lixeira/exclusão permanente, favoritar, ações em lote,
  comentários. Toda mutação grava no histórico via `historyService`.
- `tagService` — criar/editar/excluir tags (cor, ícone, descrição),
  atribuir tags a um arquivo.
- `favoriteFolderService` — separadores personalizados: criar, renomear,
  excluir, reordenar, recolher/expandir, adicionar/mover/remover arquivos
  (usado pelo drag-and-drop da sidebar).
- `relationshipService` — relacionamentos entre quaisquer dois arquivos,
  navegáveis nos dois sentidos, com tipo e descrição.
- Rotas de API completas para tudo isso em `src/app/api/`.

**Frontend**
- `FileExplorer` — componente central reutilizado por `/arquivos` e por
  todas as rotas por tipo (`/npcs`, `/personagens`, `/pistas`, `/puzzles`,
  `/documentos`, `/objetos`, `/eventos`, `/locais`, `/mapa`, `/sessoes`) e
  pelas telas `/arquivados` e `/lixeira`: busca instantânea, ordenação,
  filtro por tag, visualização em grade/lista, seleção múltipla com ações
  em lote, menu de contexto (clique direito ou botão "..."), arraste de
  arquivos para os separadores de favoritos na sidebar.
- Editor de arquivo (`/arquivos/[fileId]`) — nome, descrição, conteúdo,
  tags, relacionamentos (criar/remover, buscando outros arquivos da
  campanha), comentários e histórico, com **auto-save** debounced.
- Sidebar com Favoritos totalmente interativos: criar/renomear/excluir/
  reordenar separadores, recolher/expandir, e soltar arquivos arrastados
  da lista/grade diretamente num separador.
- `/configuracoes` — gerenciador de tags (criar, recolorir, descrever,
  excluir).
- Dashboard atualizado: quantidade de arquivos por tipo (barras), últimas
  alterações, favoritos e arquivos recentes, todos clicáveis.
- Componentes reutilizáveis desacoplados: `FileCard`, `FileListRow`,
  `Toolbar` (embutido no `FileExplorer`), `ContextMenu`, `SearchBar`
  (embutido no `FileExplorer`), `TagChip`, `Modal`, `Breadcrumb`,
  `HistoryTimeline`, `NewFileModal`, `FavoritesSection`.

Validado nesta sessão com `npm install`, `tsc --noEmit` e `next lint` reais
— sem erros de lógica; os únicos avisos restantes vêm do Prisma Client não
gerado neste sandbox (rede restrita), e desaparecem com
`npx prisma generate` num ambiente normal.

**Não implementado naquela etapa:** Quadro de Investigação, Compilador sem
novas regras, Modo Jogador e Importação/Exportação. O Quadro e o Modo Jogador
foram entregues na V4; a Importação/Exportação foi entregue na V5.

## V1 — Fundamentos (entrega anterior)

**Banco de dados (`prisma/schema.prisma`)** — modelo de dados completo para
todo o produto, não só para o V1:
- `Campaign` com sistema (Ordem Paranormal / D&D 5e / Personalizado)
- Builder de sistema personalizado: `CampaignAttribute`, `CampaignSkill`,
  `CampaignClass`, `CampaignRace`
- `CampaignFile` — modelo polimórfico único para NPC, Personagem, Puzzle,
  Documento, Pista, Objeto, Evento, Sessão, Mapa, Imagem, Áudio, Vídeo,
  Anotação e Local, cada um com `data: Json` para os campos específicos do
  tipo. Isso é o que permite relacionamentos, tags, favoritos e busca
  funcionarem de forma uniforme entre todos os tipos, como o prompt pede.
- `Relationship` (arquivo ↔ arquivo, com tipo e navegável nos dois sentidos)
- `Tag` / `FileTag` com cor personalizada
- `FavoriteFolder` / `FavoriteEntry` (separadores personalizados, reordenáveis)
- `Session` + checklist de preparação
- `TimelineEvent`
- `BoardNode` / `BoardEdge` (Quadro de Investigação — posição x/y e conexões)
- `PlayerModeConfig` / `PlayerVisibility` (visibilidade por arquivo)
- `Attachment`, `Comment`, `FileHistoryEntry` (anexos, comentários, histórico
  por arquivo, como especificado)

**Backend**
- `src/services/campaignService.ts` — toda a persistência de campanhas
  passa por aqui (nunca Prisma direto nas rotas)
- `src/services/campaignHealthService.ts` — o **Compilador**: hoje audita
  arquivos sem relacionamento, puzzles sem resposta definida e sessões
  vazias, e calcula a "Saúde da Campanha" (0–100%)
- `src/app/api/campaigns` — CRUD completo (`GET`/`POST`/`PATCH`/`DELETE`)
- `src/app/api/campaigns/[id]/health` — endpoint do Compilador

**Frontend**
- Tema claro/escuro com tokens de design dedicados (`globals.css`)
- Sidebar completa com todas as seções do prompt (Dashboard, Arquivos,
  Personagens, NPCs, Locais, Objetos, Pistas, Puzzles, Documentos, Eventos,
  Sessões, Timeline, Mapa, Quadro de Investigação, Favoritos, Arquivados,
  Lixeira, Configurações)
- Lista de campanhas + formulário de criação (escolha de sistema)
- Dashboard por campanha: estatísticas, últimas alterações, sessão atual,
  e o widget do Compilador (anel de saúde + lista de erros/avisos/sugestões)

## Roadmap (V6+)

O schema já suporta a maior parte disso — falta a UI/rotas de cada parte:

- **V6** — Simulador ("Compilar e Simular"): percorre o grafo de
  relacionamentos procurando pelo menos um caminho válido até o final da
  campanha e aponta onde o caminho quebra; regras de auditoria mais
  específicas por sistema (Ordem Paranormal, D&D 5e)
- **V8** — Tela dedicada de planejamento de sessões usando o modelo `Session` do
  schema (hoje o checklist mora em `CampaignFile.data`), upload real de anexos
  (blob storage) e regras parametrizadas por sistema.

## Estrutura de pastas

```
prisma/schema.prisma        modelo de dados completo
src/types/                  tipos compartilhados
src/lib/prisma.ts           singleton do Prisma Client
src/services/                regras de negócio (nunca Prisma direto nas rotas/páginas)
src/hooks/                  hooks de UI (tema, etc.)
src/components/             componentes reutilizáveis + seus .module.css
src/app/                    rotas (App Router) e API routes
```
