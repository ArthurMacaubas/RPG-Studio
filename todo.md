# Melhorias propostas — análise inicial

- [x] Ler e classificar as melhorias do prompt anexado, identificando dependências e prioridade.
- [x] Criar prévia “Ver como jogador” baseada no filtro real de publicação e grants.
- [x] Expor a prévia em endpoint e contrato tipado da API.
- [x] Integrar o seletor de membro e o resumo de visibilidade no Modo Jogador.
- [x] Validar TypeScript, lint, testes e build da aplicação principal.

## V14 — Segurança e consistência

- [x] Ler README, auditoria P0 e arquitetura atual antes das mudanças.
- [ ] Verificar o estado das migrations no Neon sem aplicar alteração de schema. *(Bloqueado neste ambiente: `DATABASE_URL` não é um URL PostgreSQL válido.)*
- [x] Implementar rate limiting progressivo por IP e e-mail em login, registro e aceite de convite.
- [x] Adicionar middleware com headers de segurança compatíveis com a aplicação.
- [x] Confirmar que a prévia por membro reutiliza o filtro de acesso do servidor, mesmo com o Modo Jogador pausado.
- [x] Extrair lógica tipada para a pasta padrão em `fileService.setFavorite`.
- [x] Cobrir as regras novas com testes automatizados.
- [x] Executar instalação, tipos, lint, testes e build de produção.
- [x] Atualizar documentação da V14 e empacotar a entrega.

## V15 — Combate, ameaças e rate limiting confiável

- [x] Ler README, relatório V14 e auditoria P0 antes de alterar o domínio.
- [x] Reforçar o rate limiter para limitar IPs distintos por e-mail e documentar a dependência de proxy confiável.
- [x] Confirmar uma `DATABASE_URL` PostgreSQL válida e o status das migrations no Neon antes de criar schema novo.
- [x] Modelar ameaças no `CampaignFile` polimórfico e criar modelos persistentes para encontro, participantes e estados de combate.
- [x] Gerar e revisar a migration de combate antes de qualquer aplicação no Neon.
- [x] Implementar `combatService`, rotas API e contratos tipados com guards, histórico e auditoria.
- [x] Integrar o painel de encontro à Sala de Sessão e definir a visão protegida do jogador.
- [x] Cobrir iniciativa, avanço de turno/rodada e visibilidade do jogador com testes puros.
- [x] Executar instalação, tipos, lint, testes e build de produção.
- [x] Atualizar a documentação da V15 e empacotar a entrega.

## Próxima evolução — Core investigativo de relacionamentos

- [x] Ler integralmente o prompt anexado e identificar instruções ainda compatíveis com a V15.
- [x] Auditar schema, migrations, serviços, rotas, componentes e consumidores atuais de `Relationship` e `RelationshipKind`.
- [x] Mapear riscos de compatibilidade em Quadro, Compilador, importação/exportação e Modo Jogador.
- [x] Projetar a migration não destrutiva para tipos extensíveis, importância, visibilidade e campanha de relacionamento.
- [x] Confirmar a estratégia de preservação e mapeamento dos relacionamentos legados antes de alterar o Neon.
- [x] Aplicar a migration `20260821192014_relationship_core_extensible` e regenerar o Prisma Client.
- [x] Implementar serviço, API, RelationshipManager, JSON, Compilador e Modo Jogador compatíveis.
- [x] Executar instalação, tipos, lint, testes e build de produção.
- [x] Atualizar documentação final e empacotar a entrega investigativa.

## V17 — Relationship Integrity & Security

- [x] Ler integralmente o prompt V17 e auditar schema, migrations, serviço, APIs, gerenciador, permissões, Modo Jogador, JSON e Compilador.
- [x] Centralizar a regra de visibilidade por papel/membro e acessibilidade das duas entidades relacionadas.
- [x] Corrigir `get`, `getForEntity`, `getGraph` e `listForPlayer` para nunca enviar relações privadas ao jogador.
- [x] Auditar duplicações existentes no Neon antes de introduzir a unicidade persistente.
- [x] Criar migration não destrutiva com unicidade por campanha, origem, destino e tipo, tratando conflito como resposta compreensível.
- [x] Garantir semântica de direção e remover relações apontando para entidades inexistentes ou de outra campanha durante importação.
- [x] Adicionar testes de matriz de visibilidade, endpoints, direção, duplicação e concorrência.
- [x] Executar instalação, tipos, lint, testes, build e documentação final da V17.

## V18 — Integrity fixes after V17 audit

- [x] Auditar validação JSON, importação, `RelationshipType`, fallback `GENERIC`, P2002, grafo, legado `kind` e segurança V17.
- [x] Rejeitar `typeKey` inexistente antes da criação da campanha, sem fallback silencioso para `GENERIC`.
- [x] Validar tipos personalizados, globais, referências não declaradas e duplicação de tipos no JSON.
- [x] Tratar explicitamente P2002 em criação e atualização de relacionamento como conflito `409`.
- [x] Corrigir `getGraph()` para excluir arquivos arquivados, lixeira e relações dependentes dessas entidades para Mestre e jogador.
- [x] Auditar unicidade de tipos globais e documentar qualquer recomendação de integridade estrutural não segura para esta versão.
- [x] Cobrir importação, visibilidade, endpoints, grafo e preparar constraint real de banco. *(35 testes unitários focados aprovados; teste PostgreSQL isolado criado, mas indisponível neste ambiente por `DATABASE_URL` inválida para Prisma.)*
- [x] Executar validações finais, gerar relatório V18 e empacotar sem avançar para V19.

## V19 — Visual Redesign, UX Polish & Design System

- [x] Consolidar o prompt V19 e auditar layout, componentes, CSS Modules, responsividade e rotas atuais.
- [x] Criar tokens globais de cor, tipografia, espaçamento, raio, sombra e transição para o tema escuro profissional.
- [x] Refatorar componentes visuais compartilhados, feedbacks, header, breadcrumbs e navegação lateral sem alterar APIs ou regras de negócio.
- [x] Redesenhar biblioteca, favoritos, listas e explorador de arquivos com estados, ações e metadados legíveis.
- [x] Refinar editores, RelationshipManager, grafo, quadro de investigação e compilador sem alterar suas lógicas. *(Não existe rota separada para o grafo oficial; o Quadro e a visualização compartilhada receberam o acabamento investigativo sem criar rotas novas.)*
- [x] Polir telas de sessão, personagem, configurações, autenticação, estados vazios, acessibilidade e modo responsivo. *(A fundação global, os componentes reutilizáveis e as superfícies prioritárias passaram a reger contraste, foco, drawer mobile, modais, estados e responsividade; nenhuma regra de negócio foi alterada.)*
- [x] Executar auditoria de consistência, testes, TypeScript, lint, build, relatório e pacote V19 sem iniciar V20.

## V20 — Hardening da Fronteira de Publicação

- [x] Auditar schema, migrations, serviços, rotas, componentes e testes para identificar exposição pública, duplicação ou lacunas de publicação.
- [x] Definir uma política server-side central de `ViewerContext`, arquivo visível e projeção explícita por contexto.
- [ ] Preservar OWNER, PLAYER P1–P4 e link público; exigir campanha, arquivo ativo, não arquivado, fora da lixeira, publicação e grant quando aplicável.
- [ ] Verificar a exigência de Modo Jogador habilitado nos fluxos que dependem dela.
- [x] Aplicar política a arquivos, campanhas, dashboard, quadro, busca, Modo Jogador, relacionamentos, comentários, anexos, tags, favoritos e histórico, incluindo rotas.
- [x] Corrigir comentários e anexos para exigir autenticação, campanha e autorização reais; substituir retornos Prisma amplos por projeções seguras onde necessário.
- [x] Melhorar a curadoria e a prévia do Modo Jogador usando a mesma projeção server-side, com estados Público, Grant, Privado, Arquivado e Indisponível.
- [x] Cobrir OWNER/P1–P4/link público/sem sessão, publicação, grants, arquivamento, lixeira, Modo Jogador, acesso direto, comentários, anexos, busca, dashboard, favoritos, quadro e relações. *(74 testes unitários aprovados; teste PostgreSQL isolado não conectou porque `DATABASE_URL` não possui protocolo PostgreSQL válido.)*
- [x] Executar prisma validate/format, TypeScript, lint, testes, build, relatório e pacote V20 sem iniciar V21.

## V20.1 — Integridade de Dados e Testes de Integração

- [x] Auditar schema, migrations, CampaignTransfer, fileService, rotas, tipos, validações de data e tests atuais.
- [x] Rejeitar datas inválidas com caminho, valor e regra; remover qualquer fallback silencioso de data atual.
- [x] Validar campanha cruzada para tags, arquivos, sessões, timeline, quadro, relações, tipos e sistema personalizado.
- [x] Preservar IDs/referências conforme `identityMode` e falhar antes da criação se o JSON for inválido.
- [x] Validar entradas de rotas com Zod, sem confiar em casts TypeScript.
- [x] Adicionar dry run, resumo hierárquico, caminhos de erro, remapeamento/preservação e bloqueio de confirmação à importação.
- [x] Cobrir datas, tags cross-campaign, IDs duplicados, referências ausentes, tipos globais/customizados/legados e rollback transacional. *(86 testes unitários aprovados; script PostgreSQL isolado preparado.)*
- [x] Auditar constraints PostgreSQL e documentar qualquer recomendação de FK cruzada antes de migration. *(Teste real não conectou porque `DATABASE_URL` não possui protocolo PostgreSQL válido; nenhuma escrita ocorreu.)*
- [x] Executar prisma format/validate, TypeScript, lint, testes, build, relatório e pacote V20.1 sem iniciar outra versão.

## V20.2 — Fechamento de Superfícies Administrativas

- [x] Auditar health, simulate, timeline, relationshipService, rotas, tipos e testes sem reimplementar a política V20.
- [x] Tornar health e simulate estritamente OWNER-only no serviço e na API, sem diagnóstico administrativo para PLAYER/PUBLIC.
- [x] Escolher e aplicar regra explícita para timeline administrativa, com projeções seguras e sem arquivo Prisma amplo.
- [x] Compor `get`, `getForEntity`, `getGraph` e `listForPlayer` de Relationship com `publicationPolicy.ts` e Modo Jogador.
- [x] Cobrir chamadas diretas de API para OWNER, P1–P4, link público, Modo Jogador ligado/desligado e ausência de sessão. *(45 testes focados aprovados em health, simulate, timeline e Relationship; a matriz de relacionamento preserva os cenários de link público e Modo Jogador ligados/desligados.)*
- [x] Verificar ausência de nomes, IDs, dados e referências privadas em health, timeline e relações. *(Respostas negadas de health, simulate e timeline não retornam mensagens privadas; a projeção de timeline não contém `data`; as leituras de Relationship seguem a política V20 e a audiência V17.)*
- [x] Executar prisma format/validate, TypeScript, lint, testes, build, teste PostgreSQL se disponível, relatório e pacote V20.2 sem iniciar V21. *(Prisma, TypeScript, lint, 124 testes e build aprovados; conexão real bloqueada por `P1012` antes de qualquer escrita, conforme relatório V20.2.)*

## V20.4 — Fechamento documental do Marco 1

- [x] Blindar o contrato público de erros HTTP com `PublicApiError`, códigos estáveis e mensagens neutras.
- [x] Remover eco de mensagens, detalhes Zod e validações internas nas respostas de API.
- [x] Corrigir o typecheck de `PrismaClientKnownRequestError` no teste com `clientVersion` sintético compatível.
- [x] Cobrir 400, 401, 403, 404, 409, 422, 429 e 500, além de Prisma P2025/P2002/P2003 e erro inesperado.
- [x] Executar Prisma generate/format/validate, TypeScript, lint, 146 testes e build de produção.
- [x] Criar `V20_4_RELATORIO.md` e registrar que não houve migration, operação de banco ou alteração de dados.
- [ ] Executar validação PostgreSQL em base de teste isolada. *(Separado para o Marco 2; não iniciar nesta entrega.)*


## Q02 — Filtros, busca e camadas de investigação

- [x] Confirmar Q01.1 aprovado e auditar editor, board payload, filesApi, relações oficiais e hipóteses.
- [x] Implementar filtros combináveis locais/administrativos por tipo, tags, escopo de arquivo, importância, visibilidade, status de hipótese e stance de evidência.
- [x] Preservar fontes separadas: CampaignFile, Relationship, BoardEdge, evidência e hipótese; não persistir filtros nem criar novas relações.
- [x] Adicionar busca local por nome, identificação/conteúdo de arquivo e título/resumo de hipótese.
- [x] Distinguir visualmente as camadas e manter estados vazios explicativos, teclado, foco e responsividade.
- [x] Cobrir filtros, camadas, busca, toggle, player/público e ausência de chamadas repetidas com testes focados.
- [x] Executar validações locais; não havia sequência PostgreSQL aplicável porque Q02 não alterou schema, serviços de banco ou dados.
- [x] Criar `Q02_FILTROS_CAMADAS_RELATORIO.md`, `Q03_OVERLAY_GRAFO_OFICIAL_PROMPT.md` e pacote sem `.env`, dependências, build ou logs.
- [x] Aprovar Q02 sem iniciar Q03.

### Riscos Q02 — resolvidos ou registrados

- O painel informa o escopo carregado; ausência de ficha ou relação não é tratada como inexistência canônica.
- `filesApi.list` é reutilizado apenas quando o escopo muda; busca, tipo, tags e favoritas permanecem locais, sem loop por tecla.
- `Relationship` oficial e `BoardEdge` visual permanecem contratos e camadas distintas; o overlay oficial foi explicitamente deixado para Q03.
- O Modo Jogador e a rota pública não importam o painel nem recebem filtros/camadas administrativas.
- Validação final: Prisma generate/format/validate, TypeScript, lint, 27 suítes/179 testes e build aprovados; captura administrativa autenticada validada com evidências anonimizadas.



## Q03 — Overlay do grafo oficial de relações

### Gate e decisão de execução

- [x] Confirmar Q02 aprovado e ler `Q03_OVERLAY_GRAFO_OFICIAL_PROMPT.md`, relatório Q02, editor, `relationshipsApi.graph`, `relationshipService`, tipos e referência `RelationshipManager`.
- [x] Confirmar que Q03 não exige migration, serviço novo ou alteração de publicação: o contrato readonly existente será reutilizado.
- [x] Definir estratégia de reversão: remover somente o estado, handlers, SVG/painel e estilos do overlay Q03, preservando o canvas/BoardEdge e os filtros Q02.

### Plano Q03

- [x] Criar geometria readonly para relações oficiais usando nós do canvas por `sourceId`/`targetId`.
- [x] Diferenciar visualmente relação oficial de BoardEdge, incluindo direção, tipo, importância e visibilidade.
- [x] Adicionar seleção acessível, Escape e painel readonly com origem, destino, tipo, rótulo, descrição, importância, visibilidade e links para os arquivos.
- [x] Manter overlay condicionado à camada/filtros Q02, sem criar ou editar Relationship/BoardEdge e sem novas consultas por busca local.
- [x] Cobrir separação por testes puros/contratuais, validar typecheck/lint/testes/build e capturar a rota administrativa autenticada.
- [x] Documentar Q03 aprovado e gerar prompt de Q04.
- [x] Q03 aprovado: 28 suítes / 183 testes, build e captura administrativa autenticada aprovados; nenhum banco alterado.

## Q04 — Pins, notas e agrupamentos visuais do quadro

### Gate e decisão de modelagem

- [x] Confirmar Q03 aprovado e ler seu relatório/prompt, schema, migrations, serviços de board, export/import e política OWNER/publicação.
- [x] Auditar sem escrita o banco PostgreSQL isolado de teste e verificar compatibilidade antes de qualquer migration.
- [x] Documentar a decisão entre extensão do quadro existente e novas entidades de workspace antes de gerar migration.
- [x] Implementar somente pins, notas e grupos visuais persistidos, sem criar arquivos, relações oficiais ou payload de jogador.
- [x] Garantir OWNER-only, campaign-scoped, referências válidas, remoção acessível e exclusão de exportação pública/player.
- [x] Integrar a extensão administrativa de export/import conforme contrato existente, sem antecipar vistas, diagnósticos ou planejamento de sessões.
- [x] Validar migration e script de banco específico em teste isolado; limpeza temporária concluída sem reset/drop/seed amplo.
- [x] Criar testes, captura autenticada, relatório Q04, prompt Q05 e checkpoint antes de iniciar Q05.
- [x] Q04 aprovado: 31 suítes / 199 testes, migration aditiva aplicada em teste, integração PostgreSQL, build e captura autenticada aprovados.

### Riscos Q04

- A escolha de modelagem foi resolvida com entidades próprias e referências compostas campanha-scoped, documentadas em `Q04_MODELING_DECISION.md`.
- A migration foi aditiva, revisada e aplicada somente no PostgreSQL isolado de teste; não há conversão de dados legados.
- Pins/grupos permanecem raciocínio visual administrativo e não são `CampaignFile`, `Relationship`, `BoardEdge`, hipótese ou evidência.
- O export/import administrativo remapeia grupos por `fileId`; jogador/público não consultam nem recebem anotações.

## Q05 — Vistas salvas por sessão, caso ou arco

- [x] Confirmar Q04 aprovado e ler `Q04_PINS_NOTAS_GRUPOS_RELATORIO.md`, `Q04_MODELING_DECISION.md`, schema/migration, serviços e transferência.
- [x] Definir e documentar o pertencimento de pins/grupos à vista e o comportamento para referências removidas antes de migration.
- [x] Auditar o banco isolado sem escrita e decidir se a modelagem é entidade própria campaign-scoped.
- [x] Implementar vistas nomeadas administrativas com snapshot/restauração local de pan, zoom, filtros, camadas e referências permitidas, sem alterar o quadro canônico.
- [x] Garantir OWNER-only, limites de payload, nomes, duplicidade, ordenação, edição e remoção seguras.
- [x] Integrar export/import somente com remapeamento explícito e compatibilidade legada; não expor vistas ao jogador/público.
- [x] Cobrir testes puros/contratuais, integração PostgreSQL específica, captura autenticada e validação completa.
- [x] Criar `Q05_VISTAS_SALVAS_RELATORIO.md`, prompt de Q06, atualizar riscos e parar no checkpoint antes de Q06.
- [x] Q05 aprovado: migration aditiva aplicada no PostgreSQL isolado, 34 suítes/213 testes, build, integração PostgreSQL e captura administrativa anonimizada aprovados.

### Riscos Q05

- Uma vista deve ser configuração de navegação, nunca cópia ou mutação de `BoardNode`, `BoardEdge`, `Relationship`, `CampaignFile`, hipótese, evidência, pin ou grupo canônico.
- Referências a pins/grupos removidos precisam de política explícita de omissão, aviso ou rejeição; não podem gerar registros fantasmas. **Resolvido:** criação/atualização rejeitam referências inválidas e a listagem omite referências removidas com warning.
- Snapshot amplo de filtros pode exceder limites ou persistir dados administrativos indevidos; validar tamanho e campos permitidos. **Resolvido:** schema de snapshot limitado, validação de campos e limites de payload cobertos por testes.
- Restauração precisa ser local e reversível, sem chamadas de escrita ao quadro e sem alterar qualquer projeção do jogador. **Resolvido:** restauração local validada na UI e isolamento do jogador coberto por teste/integração.

## Q06 — Diagnósticos investigativos e integração com Compilador

- [x] Criar prompt de transição `Q06_DIAGNOSTICOS_COMPILADOR_PROMPT.md` somente após aprovação de Q05.
- [x] Auditar o Compilador existente, sua autorização OWNER-only, contrato de saída e superfícies de jogador/público antes de implementar.
- [x] Implementar exclusivamente diagnósticos determinísticos, explicáveis e acionáveis; não usar IA nem mutar dados automaticamente.
- [x] Cobrir hipóteses sem evidência/suporte, contradições, arquivos arquivados/lixeira, pistas críticas sem hipótese, relações importantes fora do quadro e referências inválidas de pins/grupos.
- [x] Garantir testes determinísticos por regra, links de correção e ausência de alertas para PLAYER/público.
- [x] Executar validações completas e criar relatório/prompt seguinte somente se Q06 for aprovado.
- [x] Q06 aprovado: nenhuma migration/dependência nova, 36 suítes/221 testes, Prisma, TypeScript, lint, build e captura autenticada administrativa aprovados.

### Riscos Q06

- A criticidade de pistas não tinha coluna própria. **Resolvido:** somente `data.critical === true`, `data.importance === 'CRITICAL'` ou `data.priority === 'CRITICAL'` geram o diagnóstico.
- Diagnósticos poderiam vazar para PLAYER/público. **Resolvido:** health/simulate continuam OWNER-only e não há importações administrativas nas superfícies de jogador/publicação.
- Correções automáticas poderiam transformar raciocínio em fato. **Resolvido:** cada issue é somente leitura e aponta para uma ação explícita existente.
- Bundle stale poderia parecer falha funcional. **Resolvido:** reinício limpo do servidor confirmou a rota e o fluxo; o incidente não alterou banco.

## Q07 — Auto-layout opcional e caminhos de pistas

- [x] Criar prompt de transição `Q07_AUTO_LAYOUT_CAMINHOS_PROMPT.md` somente após aprovação de Q06.
- [x] Auditar posições, drag/pan, BoardEdge, Relationship, hipóteses/evidências, vistas Q05 e diagnósticos Q06 antes de implementar.
- [x] Implementar preview/cancelamento e persistência explícita de posições sem criar nós, arestas ou relações.
- [x] Implementar caminhos locais distinguindo relação oficial de evidência de hipótese.
- [x] Cobrir ciclos, ausência de caminho, múltiplos caminhos, desempate determinístico, acessibilidade e prefers-reduced-motion.
- [x] Executar validações completas e criar relatório/prompt seguinte somente se Q07 for aprovado.
- [x] Q07 aprovado: sem migration/dependência nova, 39 suítes/241 testes, integração PostgreSQL transacional, build e captura administrativa anonimizada aprovados.

### Riscos Q07

- Preview poderia persistir posições antes da confirmação. **Resolvido:** estado local separado e endpoint bulk chamado apenas por `Confirmar posições`.
- Um lote de layout poderia falhar parcialmente. **Resolvido:** validação integral campaign-scoped e transação PostgreSQL com rollback verificado.
- Evidência poderia ser interpretada como fato ou criar relação. **Resolvido:** segmentos são rotulados, `BoardEdge` não participa e nenhum write ocorre no cálculo.
- Caminhos múltiplos poderiam variar conforme a ordem de entrada. **Resolvido:** BFS limitado, adjacency ordenado por comparador estável, seleção explícita no painel.
- Auto-layout poderia retirar controle do Mestre. **Resolvido:** preview/cancelamento, confirmação inequívoca e bloqueio de mutações concorrentes durante a prévia.

## Q08 — Planejamento operacional de sessões

- [x] Criar prompt de transição `Q08_PLANEJAMENTO_SESSOES_PROMPT.md` somente após aprovação de Q07.
- [x] Auditar `Session`, sala de sessão, combate, timeline, export/import, hipóteses e vistas antes de migration ou alteração de contrato.
- [x] Documentar `Q08_MODELING_DECISION.md` após auditoria sem escrita no banco isolado.
- [x] Implementar objetivos, roteiro, checklist estruturado, resumo pós-sessão e vínculos campaign-scoped sem duplicar conteúdo.
- [x] Integrar abrir vista e destacar hipótese somente por ações administrativas/localmente seguras.
- [x] Cobrir OWNER, PLAYER/público, limites, duplicidade, remoção, export/import, remapeamento e compatibilidade legada.
- [x] Executar validações completas, integração PostgreSQL guardada, evidência browser anonimizada, relatório e prompt seguinte.
- [x] Q08 aprovado: migration aditiva aplicada somente no PostgreSQL isolado de teste; 42 suítes/258 testes, Prisma, TypeScript, lint, build, segurança e browser aprovados.

### Riscos Q08 — resolvidos ou registrados

- A coexistência entre `CampaignFile(type=SESSION)` e `Session` Prisma foi preservada por decisão explícita; não houve conversão automática nem publicação de planejamento.
- Vínculos de fichas, hipóteses e vistas validam campanha, unicidade e existência; substituição e remoção não apagam os recursos referenciados.
- Importação mantém mapas de sessão, hipótese e vista até a criação dos joins e usa transação para impedir estados parciais; colisão deliberada de tag confirmou rollback no PostgreSQL de teste.
- PLAYER/P1–P4, link público e publicação não importam nem recebem superfícies Q08; a auditoria estática e o script de integração confirmaram o isolamento.
- O timeout transitório de browser ocorreu durante confirmação modal de limpeza; a fixture foi verificada, removida pela UI e não deixou vista ou hipótese residual.

### Riscos Q03

- `relationshipsApi.graph` já aplica a política server-side; o cliente não deve reconstruir visibilidade nem consultar entidades privadas.
- Relações podem ter endpoints fora dos nós atuais; devem ser omitidas do desenho sem serem tratadas como inexistentes canônicas, mantendo a contagem/estado explicativo.
- Relações não direcionais precisam de tratamento `↔`; direcionais devem apontar `sourceId → targetId` sem confundir a seta do BoardEdge.
- O overlay não pode capturar drag/pan, ativar ações de conexão ou oferecer edição/exclusão de Relationship.
- O jogador/público não pode importar o overlay nem receber dados administrativos adicionais.
