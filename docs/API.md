# API e comunicação

## Contrato geral

Componentes usam `src/lib/api.ts`. Handlers validam JSON ou `FormData` com Zod, delegam aos serviços e retornam JSON. Erros usam status `400`/`401`/`403`/`404`/`409`/`422`/`429`/`500` conforme domínio; mensagens internas não devem ser serializadas.

## Grupos de rotas

| Grupo | Rotas principais | Uso |
|---|---|---|
| Auth | `/api/auth/login`, `/register`, `/logout`, `/me` | sessão e identidade |
| Campanhas | `/api/campaigns`, `/api/campaigns/[id]` | CRUD e acesso |
| Arquivos | `/api/campaigns/[id]/files`, `/api/files/[id]` e subrotas | conteúdo, tags, favoritos, anexos e grants |
| Temas | `/api/campaigns/[id]/themes`, `.../[themeId]`, `actions`, `assets` | rascunho, publicação, aplicação e upload |
| Relacionamentos | `/api/relationships`, `/api/campaigns/[id]/relationships/graph` | grafo oficial |
| Investigação | `/api/campaigns/[id]/board`, `board/*`, `hypotheses/*` | quadro, hipóteses e evidências |
| Sessões | `/api/campaigns/[id]/session-plans`, `/api/session-plans/[id]` | planejamento |
| Combate | `/api/campaigns/[id]/combat/*` | encontros e participantes |
| Publicação | `/api/campaigns/[id]/player-view`, `/api/player/[shareSlug]` | leitura filtrada |
| Transferência | `/api/campaigns/[id]/export`, `/api/campaigns/import/*` | export/import validado |
| Operação | `/health`, `/health/simulate`, `/search`, `/tags`, `/timeline` | compilador, busca e apoio |

As subrotas de recurso seguem `GET` para leitura, `POST` para criação/ações, `PATCH` para atualização e `DELETE` quando o serviço expõe remoção. O inventário exato está em `src/app/api` e deve ser consultado quando um contrato for alterado.

## Autenticação e autorização

Sessões usam cookie HTTP-only; handlers e serviços aplicam `getCampaignAccess`, `assertCampaignRole` ou `assertOwnedCampaignForWrite`. Jogadores recebem somente dados publicados, grants e audiência permitidos. Endpoints de upload aceitam `FormData` sem `Content-Type: application/json`.

## Exemplo

```ts
const response = await fetch(`/api/campaigns/${campaignId}/themes`, {
  headers: { Accept: 'application/json' }
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error ?? 'Request failed');
```
