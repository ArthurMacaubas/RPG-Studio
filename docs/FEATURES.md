# Funcionalidades

| Funcionalidade | Estado | Ponto principal | Limitação relevante |
|---|---|---|---|
| Campanhas e sistemas | Completa | `campaignService`, páginas `/campaigns` | payloads específicos usam JSON |
| Arquivos polimórficos | Completa | `fileService`, `CampaignFile` | não é uma tabela por tipo |
| Documentos e Markdown | Completa | `DocumentEditor`, `src/lib/markdown.ts` | parser é deliberadamente limitado |
| Tags, favoritos e histórico | Completa | `tagService`, favoritos, histórico | escopo é por campanha/usuário |
| Personagens, NPCs e ameaças | Completa | `CharacterSheet`, `threeDetVictory` | regras específicas são parciais/configuráveis |
| 3DeT Victory | Implementada na fork | `threeDetVictory.ts`, `/regras` | regra resumida, não substitui livro/licença |
| Combate e sala de sessão | Completa | `combatService`, `sessionPlanningService` | integração visual exige validação manual |
| Timeline e briefing | Completa | serviços e rotas de timeline/briefing | conteúdo é fornecido pelo usuário |
| Quadro de investigação | Completa | `boardService`, pins, grupos e views | quadro visual é separado do grafo oficial |
| Relações e compilador | Completa | `relationshipService`, `/grafo`, health/simulate | grafo oficial e Quadro de Investigação continuam separados; V6 é recolhível |
| Modo jogador | Completa | `publicationPolicy`, grants e share slug | filtro deve permanecer server-side |
| Import/export | Completa | `campaignTransferService` | uploads grandes continuam externos |
| Autenticação e convites | Completa | `auth`, `access`, rotas `/auth` | sessões e rate limit dependem da operação |
| Temas por campanha | Implementada na fork | `campaignThemeService`, `AppearanceEditor` | imagens são data URLs; rascunho não é público |
| Busca global | Completa | `/api/search` | performance depende do volume de JSON |

## Temas

Configurações são validadas por Zod, possuem rascunho e snapshot publicado, e só o snapshot publicado entra no layout público. O sistema genérico inclui tema padrão, medieval e cyberpunk nas branches destinadas ao upstream. O preset de O Sangue de Arashi permanece apenas na branch principal da fork.

## Documentos

O editor oferece leitura, edição visual e Markdown, sumário, modo foco, auto-save debounced, links `[[id|label]]`, anexos, tags, relações, comentários e histórico. Sanitização de URLs e escape HTML acontecem em `markdown.ts`.
