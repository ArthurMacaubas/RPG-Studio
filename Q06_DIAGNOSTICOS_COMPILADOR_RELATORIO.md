# Q06 — Diagnósticos investigativos e integração com o Compilador

**Status: APROVADO**  
**Data:** 25 de agosto de 2026  
**Escopo:** diagnósticos administrativos determinísticos e explicáveis; nenhuma mutação automática.

## Resultado

Q06 foi concluído e aprovado. O Compilador passou a incorporar diagnósticos investigativos com código de regra estável, severidade, mensagem, explicação, entidades afetadas e ação de correção. A mesma execução continua reproduzível para o mesmo estado da campanha, sem IA, inferência livre, heurística não documentada ou escrita automática.

O Compilador permanece **OWNER-only**. A restauração ou correção é sempre uma ação explícita do Mestre em uma superfície autorizada. PLAYER, link público e projeções publicadas não consultam nem recebem `CampaignHealth`, diagnósticos, hipóteses, evidências, pins, grupos ou vistas administrativas.

## Auditoria prévia

O Compilador existente estava concentrado em `campaignHealthService`, com cálculo de score, verificações de arquivos ativos, relações oficiais, sessões, timeline, quadro e simulação de caminhos. As rotas `GET /api/campaigns/[id]/health` e `POST /api/campaigns/[id]/health/simulate` já delegavam ao serviço, que chamava `assertCampaignRole(campaignId, 'OWNER')` antes de consultar dados privados.

A auditoria confirmou que o widget `CampaignHealthWidget` era montado no dashboard administrativo e não era importado por componentes de jogador. A política existente de erros públicos foi preservada. O Compilador não recebeu nenhuma capacidade de editar dados; a integração apenas amplia a projeção administrativa de saúde.

| Área auditada | Resultado antes de Q06 | Decisão Q06 |
| --- | --- | --- |
| Autorização | Serviço OWNER-only antes das consultas | Preservada e coberta por regressão |
| Rotas | Health e simulate administrativos | Contrato mantido; novas informações seguem o mesmo limite |
| Fonte oficial | `CampaignFile`, `Relationship` e `BoardNode` separados | Diagnósticos somente leem e não inferem fatos |
| Hipóteses/evidências | Serviço administrativo existente | Leitura campaign-scoped com estados e stances tipados |
| Anotações/vistas | Q04/Q05 OWNER-only | Referências inválidas são apontadas sem criar substitutos |
| Jogador/público | Sem acesso ao health | Isolamento mantido por código e testes |
| Schema/infraestrutura | Compatível | Nenhuma migration ou dependência nova necessária |

## Diagnósticos implementados

O núcleo puro `investigativeDiagnostics.ts` recebe uma entrada explícita e não conhece request, sessão, Prisma ou efeitos colaterais. O serviço do Compilador faz as leituras campaign-scoped e adiciona o resultado às listas existentes de erros, avisos e sugestões.

| Código | Severidade | Condição e ação |
| --- | --- | --- |
| `HYPOTHESIS_WITHOUT_EVIDENCE` | Aviso | Hipótese `OPEN` sem evidências; ação para abrir hipóteses. |
| `SUPPORTED_HYPOTHESIS_WITHOUT_SUPPORT` | Erro | Hipótese `SUPPORTED` sem stance `SUPPORTS`; ação para abrir hipóteses. |
| `HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE` | Aviso | Ao menos uma evidência `CONTRADICTS`; quando também há `SUPPORTS`, a explicação sinaliza o conflito. |
| `EVIDENCE_FILE_UNAVAILABLE` | Aviso | Evidência aponta para arquivo arquivado ou na lixeira; ação para revisar hipóteses. |
| `CRITICAL_CLUE_WITHOUT_HYPOTHESIS` | Aviso | Pista ativa com `data.critical === true`, `data.importance === 'CRITICAL'` ou `data.priority === 'CRITICAL'` sem evidência em hipótese; ação para abrir o quadro. |
| `IMPORTANT_RELATIONSHIP_OUTSIDE_ACTIVE_BOARD` | Aviso | Relação oficial `IMPORTANT` não tem os dois nós no quadro ativo; ação para abrir o quadro. |
| `BOARD_ANNOTATION_REFERENCE_INVALID` | Erro | Vista salva referencia pin/grupo ausente; ação para abrir vistas salvas. |

As mensagens usam nomes apenas na resposta administrativa autorizada. Cada issue também carrega `entityIds`, `fileId` quando aplicável, explicação e `action.href`/`action.label`. IDs ausentes de uma vista são apontados como entidades afetadas, mas não são usados para criar registros fantasmas.

A regra de pista crítica foi documentada sem migration: como `CampaignFile.data` é JSON e não há coluna de prioridade no schema, somente as chaves determinísticas acima são reconhecidas. Outros textos livres não geram alerta.

## Integração visual

O widget do Compilador agora apresenta, além da severidade, a mensagem, o código da regra, a explicação e o link de correção. A ação navega para o quadro/hipóteses/vistas administrativos conforme o diagnóstico. Foco, teclado, estados vazios, busy state e responsividade existentes foram preservados; nenhum movimento contínuo ou animação nova foi introduzido.

A validação autenticada criou uma hipótese temporária aberta sem evidências. O dashboard mostrou o alerta `HYPOTHESIS_WITHOUT_EVIDENCE`, severidade aviso, explicação e ação **Abrir hipóteses**. A hipótese foi removida pelo painel administrativo; o quadro voltou ao estado vazio sem resíduos e manteve os nós e relações oficiais existentes. A evidência anonimizada está em [`evidence/q06/q06-compilador-anonimizado.webp`](evidence/q06/q06-compilador-anonimizado.webp), com o registro textual em [`Q06_BROWSER_FINDINGS.md`](Q06_BROWSER_FINDINGS.md).

Durante a primeira tentativa visual, o servidor local retornou `MODULE_NOT_FOUND` por artefato `.next` stale na rota de hipóteses. O processo de desenvolvimento foi reiniciado e somente o diretório de build local foi removido. Após o reinício, a rota carregou, a fixture foi criada/removida e a validação terminou normalmente. Não houve alteração de banco causada pelo incidente.

## Testes e gates

| Gate | Resultado |
| --- | --- |
| `pnpm exec prisma generate` | PASS |
| `pnpm exec prisma format --check` | PASS |
| `pnpm exec prisma validate` | PASS |
| `pnpm exec tsc --noEmit -p .` | PASS |
| `pnpm exec next lint --dir src` | PASS |
| Testes focados de diagnósticos e integração do health | PASS — 2 suítes / 8 testes |
| `pnpm exec vitest run --run` | **PASS — 36 suítes / 221 testes** |
| `pnpm run build` | **PASS — compilação de produção concluída** |
| API/serviço OWNER-only | PASS — cobertura existente preservada |
| Isolamento player/público | PASS — nenhuma importação administrativa nos componentes de jogador/publicação |
| Captura autenticada | PASS — diagnóstico visível, acionável e fixture removida |

O build produziu apenas warnings não bloqueantes do cache serializável do Webpack em CSS existente e terminou com `Compiled successfully`. Q06 não exigiu migration, teste de banco específico ou provisionamento adicional.

## Segurança e integridade

Nenhuma regra Q06 cria ou altera `Relationship`, `BoardEdge`, `CampaignFile`, `BoardNode`, hipótese, evidência, pin, grupo ou vista. A relação oficial importante fora do quadro é somente sinalizada. A pista crítica é somente classificada a partir das chaves JSON documentadas. A evidência arquivada/lixeira é apontada para revisão, sem restauração automática.

O resultado de sucesso é entregue somente pelo dashboard administrativo e pelas rotas existentes que já exigem OWNER. Erros continuam usando o contrato seguro `apiErrorResponse`, sem eco de stack, credenciais, URL de banco ou detalhes internos. O relatório e a evidência não contêm valores de ambiente, tokens ou IDs reais de campanha.

## Rollback e limitações

Não houve migration nem mudança de infraestrutura. O rollback funcional consiste em remover a chamada ao núcleo `investigativeDiagnostics`, reverter os campos opcionais de `CompilerIssue` e remover a apresentação expandida do widget; as regras anteriores de saúde/simulação permanecem intactas. Nenhum rollback de dados é necessário.

Os diagnósticos são deliberadamente informativos: não executam correção, não alteram score de relações oficiais fora do quadro e não substituem a revisão narrativa do Mestre. O reconhecimento de criticidade usa somente as três formas JSON documentadas. O widget mostra até seis issues, como antes; a resposta completa continua disponível ao OWNER pelo contrato de health.

## Transição

Com Q06 aprovado, o próximo marco autorizado é Q07 — auto-layout opcional e caminhos de pistas. O próximo trabalho deve preservar controle manual, preview/cancelamento, persistência somente após confirmação, distinção entre relação oficial e evidência e `prefers-reduced-motion`. Não iniciar Q08 ou qualquer publicação/sincronização nesta etapa.
