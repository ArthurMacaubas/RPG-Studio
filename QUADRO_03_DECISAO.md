# QUADRO 03 — Decisão de modelagem e escopo

**Projeto:** RPG Campaign Studio
**Marco:** Recuperação operacional de sessões e contexto investigativo
**Pré-condição:** QUADRO 02.1 **APROVADO**, confirmado no relatório e na suíte focada (`1 arquivo / 8 testes`)
**Decisão preliminar:** **APROVADO PARA IMPLEMENTAÇÃO**, sem nova persistência

## 1. Resposta obrigatória de modelagem

**Qual dado necessário não existe no modelo Q08/Q02?**

Nenhum dado necessário para o QUADRO 03 está ausente. O modelo atual já contém a sessão relacional `Session`, seus campos de planejamento (`objectives`, `agenda`, `checklist`, `summary`, `postSummary`, `date` e `status`) e os vínculos administrativos `SessionFile`, `SessionHypothesis` e `SessionBoardView`. Os destinos já existem em `CampaignFile`, `InvestigationHypothesis`, `InvestigationBoardView` e `Relationship`.

Assim, o marco será implementado como uma composição administrativa de consultas e seletores de apresentação. Não será criado modelo, campo, migration, cópia de conteúdo, sincronização automática ou nova fonte de verdade.

## 2. Contratos auditados

| Domínio | Contrato existente | Reuso no QUADRO 03 |
| --- | --- | --- |
| Sessão e planejamento | `Session` + `sessionPlanningService` | Seleção estável por `order` e `id`; objetivos, roteiro, checklist e resumos permanecem no planejamento Q08. |
| Fichas vinculadas | `SessionFile` serializado em `SessionPlanning.files` | Nome, tipo e estado de disponibilidade para abrir ficha ou focar no quadro. |
| Hipóteses vinculadas | `SessionHypothesis` serializado em `SessionPlanning.hypotheses` | Título/status para abrir e selecionar no quadro. |
| Vistas vinculadas | `SessionBoardView` serializado em `SessionPlanning.views` | Nome/tipo para restaurar snapshot na superfície administrativa existente. |
| Relações oficiais | `Relationship` e `relationshipService.getGraph` | Leitura limitada aos IDs das fichas vinculadas, sem criar/editar `Relationship` ou `BoardEdge`. |
| Destino de ficha | `/campaigns/:id/arquivos/:fileId` | Revalidação server-side do arquivo e da campanha já existente. |
| Destino de quadro | `/campaigns/:id/investigacao` | Parâmetros efêmeros validados no destino; a página exige `OWNER`. |
| Guardas | `getCampaignAccess` / `assertCampaignRole` | Todo carregamento do painel continua OWNER-only. |
| Sala de Sessão | `CampaignFile(type=SESSION)` e `SessionCommandCenter` | Mantida fora do marco; não é a fonte Q08 de planejamento relacional. |

## 3. Limites de implementação

O ponto de integração será `SessionPlanningPanel`, já montado somente na página administrativa `/campaigns/:id/sessoes` quando o papel é `OWNER`. O novo painel será recolhível e somente de leitura em relação aos vínculos; as ações de edição continuam no fluxo Q08 existente.

Deep links transportarão apenas identificadores efêmeros validados por formato. A superfície de destino revalidará campanha e papel no servidor; recursos inexistentes ou de outra campanha resultarão em estado neutro/erro não sensível. Navegação não criará ou alterará nós, arestas, relações, hipóteses, evidências, pins, grupos, vistas, sessões ou vínculos.

PLAYER, P1–P4, Modo Jogador, links públicos e DTOs públicos não importarão o painel, seus hooks, tipos de contexto ou dados de planejamento. Não serão adicionadas dependências, automações, IA, storage, rate limiting ou qualquer fluxo de publicação.
