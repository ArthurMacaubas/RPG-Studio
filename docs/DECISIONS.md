# Decisões arquiteturais

## ADR-001 — `CampaignFile` polimórfico

- **Status:** implementado; comprovado pelo schema.
- **Decisão:** tipos de conteúdo compartilham `CampaignFile` e payload JSON `data`.
- **Consequência:** relações, tags, favoritos e busca podem ser uniformes; validação específica fica distribuída.

## ADR-002 — Serviços entre API e Prisma

- **Status:** implementado; comprovado por rotas e serviços.
- **Decisão:** handlers validam e delegam a `src/services`; componentes usam `src/lib/api`.
- **Consequência:** autorização e transações ficam centralizáveis; exige disciplina para não inserir Prisma direto em UI.

## ADR-003 — Rascunho separado de publicação em temas

- **Status:** implementado no commit `7a015a4` e migration `20261124150000_campaign_themes`.
- **Decisão:** `draftConfig` não é exibido; `publishedConfig` é snapshot público e `activeThemeId` define aplicação.
- **Consequência:** edição pode ser revisada antes de publicar; há mais estados para auditar.

## ADR-004 — Instrumentação opt-in

- **Status:** implementado no commit `941f6b0`.
- **Decisão:** logs e `Server-Timing` só são ativados por ambiente.
- **Consequência:** baixo ruído por padrão e medição operacional; não substitui benchmark ou observabilidade persistente.

## ADR-005 — Contribuições encadeadas

- **Status:** decisão desta auditoria.
- **Decisão:** manter dependências reais entre temas, 3DeT, editor, performance e responsividade, sem duplicar implementações.
- **Justificativa:** os commits originais formam uma cadeia linear e alguns patches não aplicam ao upstream isoladamente.
- **Consequência:** submissão deve respeitar a ordem registrada em `CONTRIBUTION_PLAN.md`.
