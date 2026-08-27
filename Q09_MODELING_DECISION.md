# Q09 — Decisão de modelagem: briefing e timeline públicos

**Status da decisão:** APROVADA PARA IMPLEMENTAÇÃO
**Data:** 26/08/2026
**Escopo:** somente briefing curado e timeline curada para jogadores, com publicação OWNER explícita e projeção server-side.

## 1. Evidência da auditoria

A auditoria do repositório confirmou que `TimelineEvent` já é a entidade canônica da timeline administrativa, mas seus registros não possuem estado de publicação. `timelineService` e suas rotas são OWNER-only e devem continuar assim. O Modo Jogador atual publica arquivos individualmente por `PlayerVisibility`, aplica grants e expõe link público por `PlayerModeConfig`, mas não possui briefing nem timeline pública.

O contrato legado `PublicCampaignData` abastece a Área do Jogador autenticada e o link público com arquivos e relacionamentos. A seleção legada de arquivo é deliberadamente ampla para suportar a ficha e a leitura de conteúdo publicado, mas Q09 não deve reutilizar esse payload para briefing/timeline nem adicionar dados administrativos ao retorno público. A nova projeção será um DTO separado, com campos mínimos e sem IDs internos desnecessários.

## 2. Decisão

Será criada uma entidade própria `CampaignBriefing`, com relação 1:1 por campanha, contendo título curado, corpo curado, estado `isPublished` e timestamps. A ausência do registro equivale a nenhum briefing publicado; não haverá conversão automática de descrição da campanha, sessões, objetivos ou outros dados administrativos.

`TimelineEvent` receberá apenas o campo aditivo `isPublished`, com default `false`. Eventos existentes continuarão legíveis na timeline administrativa e permanecerão privados até ação inequívoca do OWNER. A criação e edição administrativa continuam usando a entidade existente; publicação/retirada será uma mutação OWNER explícita e auditável.

A projeção pública de timeline não retorna `id`, `campaignId`, `order`, `fileId`, flags de publicação ou objetos Prisma. Ela retorna somente `title`, `happenedAt` e, quando a referência estiver publicada e acessível ao mesmo contexto, um resumo curado do arquivo relacionado (`name` e `type`). A ordem será calculada no servidor por `happenedAt` e `order`, sem depender de ordenação do cliente.

A projeção pública do briefing retorna somente `title` e `body`. O servidor só inclui o briefing quando `isPublished = true`, a campanha está ativa e o Modo Jogador está habilitado. Não haverá público-alvo por audiência para o briefing nesta etapa; o acesso por audiência/grant continuará sendo aplicado aos eventos vinculados a arquivos. Um evento sem arquivo relacionado é explicitamente público quando publicado.

## 3. Política de acesso

| Contexto | Briefing | Timeline | Arquivos relacionados |
| --- | --- | --- | --- |
| OWNER | Pode ler e editar rascunho e publicação via rota administrativa | Pode ler, editar e publicar via rota administrativa | Fluxo administrativo existente |
| PLAYER/P1–P4 autenticado | Recebe apenas briefing publicado e eventos publicados | Recebe somente eventos publicados; evento vinculado exige que o arquivo esteja publicado, ativo e permitido ao membro | `publishedFileWhere(ViewerContext)` no servidor |
| Link público | Recebe apenas briefing publicado e eventos publicados | Evento vinculado exige arquivo público; grant-only nunca aparece no link | `publishedFileWhere(PUBLIC)` no servidor |
| Sem sessão | Não acessa rotas administrativas | Não acessa rotas administrativas; link público só funciona com Modo Jogador habilitado | Sem bypass por query string ou ID |

A campanha será sempre resolvida pelo contexto (`campaignId` ou `shareSlug`) e validada no servidor. Nenhuma rota pública aceitará `fileId`, `eventId` ou `userId` para decidir visibilidade. O cliente apenas renderiza o DTO recebido.

## 4. Limites e validação

O título do briefing terá de 1 a 160 caracteres e o corpo de 1 a 20.000 caracteres. O título da timeline mantém o limite legado de 160 caracteres; a data precisa ser ISO válida com offset e ser convertível em data válida. A timeline pública terá limite server-side de 100 eventos para evitar payloads descontrolados; a ordenação será estável por data ascendente, ordem ascendente e criação ascendente quando necessário.

Mensagens públicas serão neutras. Erros de Prisma, Zod, stack traces, nomes de tabela, IDs, detalhes de autorização e conteúdo privado nunca serão retornados por APIs. A publicação e retirada gravarão `AuditEvent` sem conteúdo privado completo.

## 5. Compatibilidade

A timeline administrativa continua em `/api/campaigns/[id]/timeline` e `/api/timeline/[id]`, mantendo o formato legado para OWNER e seus testes. O novo campo será opcional no contrato legado e a UI administrativa exibirá um controle explícito de publicar/ocultar. O Modo Jogador e suas grants permanecem inalterados.

A Área do Jogador e o link público receberão campos opcionais `briefing` e `timeline` no contrato de projeção. A renderização do briefing/timeline será feita por um componente dedicado que não importa `SessionPlanningPanel`, `sessionPlansApi`, hipóteses, evidências, board views, diagnósticos ou qualquer outro módulo administrativo Q08.

## 6. Migration e rollback

A migration será aditiva: criar `CampaignBriefing`, adicionar `TimelineEvent.isPublished` com default `false` e criar os índices mínimos necessários. Ela será gerada e revisada localmente, aplicada somente no PostgreSQL de teste isolado previamente confirmado e validada pelos scripts de integração Q09. Não haverá reset, DROP, seed amplo, saneamento ou alteração de dados legados.

O rollback funcional consiste em retirar a nova UI/rotas e deixar os campos aditivos sem uso. O rollback de schema, se necessário antes de qualquer aprovação, será documentado com SQL revisado apenas para o banco de teste; nenhum rollback destrutivo será aplicado automaticamente. A restauração não sobrescreverá campanhas nem conteúdo existente.

## 7. Critérios de aceite

Q09 só será aprovado se: publicação/retirada forem explícitas, reversíveis e OWNER-only; rascunhos forem invisíveis por chamada direta, query string, link e API; PLAYER/P1–P4 receberem somente a projeção permitida ao seu contexto; link público não receber grants; eventos arquivados, em lixeira ou vinculados a arquivos não publicados não vazarem; a campanha ausente e o Modo Jogador desligado retornarem contrato neutro; a timeline for estável e limitada; contratos, serviços, rotas, UI e integração PostgreSQL passarem; e nenhuma superfície de jogador importar planejamento Q08 ou payload administrativo novo.
