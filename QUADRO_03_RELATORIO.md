# QUADRO 03 — Recuperação operacional de sessões e contexto investigativo

**Status:** **APROVADO**
**Projeto:** RPG Campaign Studio
**Commit funcional:** `11071f3`
**Branch:** `main`
**Pré-condição:** QUADRO 02.1 **APROVADO**

## 1. Objetivo e escopo entregue

O QUADRO 03 adiciona ao planejamento administrativo Q08 um painel recolhível de **Contexto investigativo da sessão**. O painel ajuda o Mestre a preparar ou retomar uma sessão selecionada usando somente dados e vínculos já existentes: sessão anterior pela ordenação administrativa, objetivos pendentes, checklist pendente, resumo de preparação, fichas vinculadas, hipóteses vinculadas, vistas salvas vinculadas e relações oficiais entre as fichas vinculadas.

A implementação foi restrita às superfícies administrativas autorizadas. O painel não cria uma segunda fonte de verdade, não copia conteúdo integral de fichas, não publica rascunhos e não altera automaticamente o quadro. As ações de contexto são navegações efêmeras para o planejamento, ficha ou quadro; o único caso de escrita possível é a ação explícita já existente do quadro para adicionar manualmente uma ficha fora do canvas, e ela não é disparada automaticamente pelo deep link.

## 2. Decisão de modelagem

**Qual dado necessário não existe no modelo Q08/Q02?** Nenhum. A auditoria confirmou que os dados necessários já estão disponíveis em `Session`, `SessionFile`, `SessionHypothesis`, `SessionBoardView`, `CampaignFile`, `InvestigationHypothesis`, `InvestigationBoardView` e `Relationship`.

Não foi criado modelo, campo, migration, endpoint paralelo, cópia de conteúdo, sincronização, cron, IA, storage ou dependência nova. O DTO administrativo de fichas vinculadas passou a incluir apenas os campos já existentes `isArchived` e `isTrashed`, para que o painel possa indicar uma referência indisponível sem tentar focá-la no quadro.

| Necessidade | Fonte canônica | Tratamento no QUADRO 03 |
| --- | --- | --- |
| Sessão e planejamento | `Session` / `sessionPlanningService` | Leitura do plano selecionado; objetivos, roteiro, checklist, data, status e resumos permanecem no Q08. |
| Sessão anterior | `Session.order` e `Session.id` | Seleção determinística, sem novo campo e sem inferência por conteúdo. |
| Fichas | `SessionFile` + `CampaignFile` | Exibe nome, tipo e estado arquivada/lixeira; navega para a ficha administrativa. |
| Hipóteses | `SessionHypothesis` + `InvestigationHypothesis` | Exibe título/status e navega para `hypothesisId` efêmero no quadro. |
| Vistas | `SessionBoardView` + `InvestigationBoardView` | Exibe nome/tipo e navega para `viewId` efêmero no quadro. |
| Relações | `Relationship` via `relationshipService.getGraph` | O endpoint existente aceita filtro opcional por `fileIds`; o servidor limita o grafo às fichas solicitadas e o painel filtra novamente somente as duas pontas vinculadas. |

## 3. Implementação

O painel foi integrado ao `SessionPlanningPanel`, que já é renderizado apenas em `/campaigns/:id/sessoes` para `OWNER`. Ele possui estados de carregamento, sessão não selecionada, referências vazias, relações indisponíveis, ficha arquivada/lixeira, recolhido/expandido e erro não sensível.

Os atalhos administrativos são os seguintes:

| Ação | Destino | Persistência automática |
| --- | --- | --- |
| Retomar planejamento | Seção existente do Q08 | Não |
| Abrir ficha | `/campaigns/:id/arquivos/:fileId` | Não |
| Focar no quadro | `/campaigns/:id/investigacao?fileId=...` | Não |
| Abrir hipótese no quadro | `/campaigns/:id/investigacao?hypothesisId=...` | Não |
| Abrir vista no quadro | `/campaigns/:id/investigacao?viewId=...` | Não |
| Adicionar ficha fora do canvas | Ação explícita existente do editor | Somente se o Mestre clicar |

Os parâmetros efêmeros passam por validação de formato no cliente e na rota do grafo. O destino do quadro mantém a proteção `OWNER` da página, e as consultas de ficha, hipóteses, vistas e relações continuam sendo revalidadas no servidor. IDs inválidos produzem estado neutro ou erro genérico, sem carregamento por ID não validado.

## 4. Matriz de acesso e isolamento

| Superfície | Resultado |
| --- | --- |
| OWNER em `/campaigns/:id/sessoes` | Painel completo, privado e recolhível. |
| PLAYER/P1–P4 | Não importa o componente nem recebe planejamento, hipóteses, diagnostics, vistas administrativas ou contexto privado. |
| Modo Jogador e link público | Sem alteração de DTO/projeção e sem importação do painel. |
| Quadro administrativo | Aceita deep links efêmeros para foco/hipótese/vista; não cria dados automaticamente. |
| Relação oficial | Somente leitura; sem `Relationship.create/update/remove` e sem uso de `BoardEdge` para inferir relação. |
| Banco | Nenhuma migration, seed, reset, DROP, DELETE ou escrita de fixture foi executada. |

O conteúdo administrativo continua atrás de `assertCampaignRole(campaignId, 'OWNER')`/`getCampaignAccess`. O filtro de relações não é uma barreira de autorização isolada: ele é apenas minimização de resposta, enquanto a rota continua sujeita ao guard existente e o serviço revalida a audiência quando aplicável.

## 5. Arquivos alterados

| Grupo | Arquivos |
| --- | --- |
| Painel e estilos | `SessionContextPanel.tsx`, `sessionContext.module.css`, `SessionPlanningPanel.tsx`, `page.module.css` do quadro |
| Seletores e contratos | `sessionContextSelectors.ts`, seu teste, `src/types/index.ts`, `src/lib/api.ts` |
| Grafo server-side | rota existente de grafo, `relationshipService.ts` e respectivos testes |
| Contratos de isolamento | `relationships-graph-boundary.test.ts`, `SessionContextQ03.test.ts` |
| Documentação | `QUADRO_03_DECISAO.md`, `QUADRO_03_VALIDACAO_BROWSER.md`, este relatório |

Não houve alteração em `schema.prisma`, `prisma/migrations`, `package.json`, `pnpm-lock.yaml`, `.env`, Modo Jogador, publicação, exportação/importação ou superfícies públicas.

## 6. Validação automatizada

Todos os gates obrigatórios foram executados em sequência e passaram.

| Gate | Resultado |
| --- | --- |
| `pnpm exec prisma generate` | Passou |
| `pnpm exec prisma format --check` | Passou |
| `pnpm exec prisma validate` | Passou |
| `pnpm exec tsc --noEmit -p .` | Passou |
| `pnpm lint` | Passou sem warnings/errors do ESLint |
| Testes focados Q03/Q08/relações | **5 arquivos / 42 testes — passou** |
| Suíte completa Vitest serializada | **47 arquivos / 284 testes — passou** |
| `pnpm build` | Passou |
| `git diff --check` e scanner de escopo/segredos | Passou |

A build apresentou warnings já existentes fora do incremento: aviso de autoprefixer em `modo-jogador/page.module.css` e mensagens de uso dinâmico relacionadas a `api/auth/me` durante geração. A compilação, lint e verificação de tipos concluíram com sucesso; os warnings não foram ampliados pelo QUADRO 03.

Os testes novos cobrem ordenação estável, sessão anterior, pendências, pureza, IDs inválidos, filtro determinístico de relações, filtro server-side OWNER/PLAYER, boundary HTTP, integração do painel e isolamento das superfícies de jogador.

## 7. Validação browser sanitizada

A validação foi feita em uma campanha sintética existente, com papel **OWNER**, sem criar ou modificar dados.

A página administrativa de sessões carregou o painel com o selo **OWNER · privado**, uma sessão selecionada, uma pendência de checklist, três fichas vinculadas e duas relações oficiais relevantes entre essas fichas. Hipóteses e vistas sem vínculo foram exibidas como estados vazios orientativos. O botão **Recolher** alternou o painel para **Expandir** e o botão **Retomar planejamento** permaneceu disponível.

O atalho **Focar no quadro** navegou com `fileId` efêmero. Após a hidratação, o quadro exibiu três nós e o status **Ficha focada no quadro**, informando que o foco era transitório e não alterava o canvas. Um `fileId` com espaço foi testado e carregou estado neutro, sem erro sensível ou tentativa de leitura inválida.

A tentativa de abrir a rota de investigação do jogador usando a sessão OWNER foi redirecionada pelo guard existente para a superfície administrativa. A ausência de importação para jogador também foi comprovada pelos testes estáticos e pela arquitetura de projeção já existente. O cenário de uma ficha vinculada fora do canvas não foi reproduzido manualmente, pois isso exigiria alterar dados; o caminho permanece coberto pelo código de estado seguro, pelo botão de ação explícita e pelos testes de contrato.

## 8. Publicação

O commit funcional foi publicado em [`11071f3`](https://github.com/ArthurMacaubas/RPG-Studio/commit/11071f36e92000e7bf625b97db14914c2960ead8) na branch `main`. O deployment Production correspondente foi confirmado como **Ready** no projeto Vercel existente e associado ao domínio [`rpg-studio-rho.vercel.app`](https://rpg-studio-rho.vercel.app). O commit documental final [`3cf3747`](https://github.com/ArthurMacaubas/RPG-Studio/commit/3cf3747695cf78c9fa6ff7551754132d0e6f65d5) também recebeu deployment Production **Ready**.

Não foi criado projeto Vercel duplicado, domínio adicional, cobrança, configuração nova ou segredo novo. O checkout local terminou limpo e sincronizado com `origin/main` após o commit funcional.

## 9. Riscos e limites reais

O painel depende da disponibilidade dos vínculos Q08 existentes; uma sessão sem links apresenta estados vazios, não infere contexto e não cria registros. Fichas arquivadas ou na lixeira permanecem identificáveis como referências administrativas, mas não recebem foco automático no quadro. Relações são exibidas somente quando o servidor consegue retornar ambas as pontas autorizadas e vinculadas.

O QUADRO 03 não implementa histórico de retomada, agenda de mesa, checklist compartilhado, persistência de foco, auditoria adicional, publicação ou recuperação automática. Os warnings de build descritos na seção de gates permanecem como dívida técnica preexistente fora deste marco.

## Referências de implementação

[1]: `QUADRO_03_DECISAO.md` — decisão de modelagem e limites do marco.
[2]: `QUADRO_03_VALIDACAO_BROWSER.md` — evidência browser sanitizada.
[3]: `src/app/campaigns/[id]/sessoes/SessionContextPanel.tsx` — painel administrativo.
[4]: `src/app/campaigns/[id]/sessoes/sessionContextSelectors.ts` — seletores puros e validação de IDs.
[5]: `src/services/relationshipService.ts` — grafo oficial com filtro server-side.
[6]: `src/app/campaigns/[id]/investigacao/InvestigationBoardEditor.tsx` — deep links e foco transitório.
