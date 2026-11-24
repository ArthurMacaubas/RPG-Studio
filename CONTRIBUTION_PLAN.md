# Plano de contribuições

## Base e auditoria

- Fork: `https://github.com/ColdHC/RPG-Studio-Cold.git`.
- Upstream: `https://github.com/ArthurMacaubas/RPG-Studio.git`.
- Branch principal do upstream: `main`.
- Base comum: `9efa7403ecde896640eda9ebe31356e2e8b16c08`.
- Fork auditada: `main` em `05c30ac`; 7 commits à frente do upstream no fetch de 24/11/2026.
- Backup: `backup-main-before-audit-2026-11-24`.
- Estado de publicação: branches abaixo são locais e ainda não foram publicadas como PR.

## Acompanhamento

| Branch | Categoria | Escopo | Dependência | Validação | Status | Prioridade | Comparação |
|---|---|---|---|---|---|---|---|
| `feat/campaign-themes` | feature | temas genéricos por campanha, rascunho/publicação/presets | upstream/main | pendente nesta auditoria | pronta para revisão | alta | não verificável enquanto local |
| `feat/three-det-victory` | feature | sistema genérico 3DeT Victory | `feat/campaign-themes` | pendente nesta auditoria | pronta após temas | alta | não verificável enquanto local |
| `feat/document-editor` | feature | editor de enciclopédia e Markdown | `feat/three-det-victory` por cadeia histórica | pendente nesta auditoria | pronta após 3DeT | média | não verificável enquanto local |
| `perf/rpg-studio-data-loading` | performance | consultas, lazy loading, índices e telemetria | `feat/document-editor` | pendente nesta auditoria | pronta após editor | alta | não verificável enquanto local |
| `perf/file-explorer-server-render` | performance | dados iniciais server-rendered dos exploradores | `perf/rpg-studio-data-loading` | pendente nesta auditoria | pronta após performance | média | não verificável enquanto local |
| `fix/responsive-layout` | fix | shell, grids, editor e controles responsivos | `perf/file-explorer-server-render` | pendente nesta auditoria | pronta após cadeia | média | não verificável enquanto local |

As branches foram reconstruídas com patches finais limpos. O preset e a identidade de O Sangue de Arashi não aparecem nelas. A branch principal da fork preserva todas as personalizações existentes.

## Commits e arquivos relevantes

| Branch | Commit local preparado | Arquivos centrais |
|---|---|---|
| `feat/campaign-themes` | `b9cb88c` | `campaignTheme.ts`, `campaignThemeService.ts`, `AppearanceEditor`, migration de temas |
| `feat/three-det-victory` | `2b9943e` | `threeDetVictory.ts`, `CharacterSheet`, `ThreeDetRulebook`, migration do enum |
| `feat/document-editor` | `de5b2a8` | `DocumentEditor`, `markdown.ts`, editor de arquivo |
| `perf/rpg-studio-data-loading` | `c53f8ba` | `performance.ts`, serviços de campanha/arquivo, índices |
| `perf/file-explorer-server-render` | `b5058aa` | `fileExplorerService`, páginas de exploração, `FileExplorer` |
| `fix/responsive-layout` | `cf9c022` | CSS Modules do shell, grids, editor e controles |

## Ordem recomendada

1. `feat/campaign-themes` — base do sistema de aparência.
2. `feat/three-det-victory` — adiciona o enum e a ficha 3DeT sobre a base de temas.
3. `feat/document-editor` — editor e parser Markdown.
4. `perf/rpg-studio-data-loading` — otimiza caminhos já introduzidos.
5. `perf/file-explorer-server-render` — depende do serviço e contrato de carregamento.
6. `fix/responsive-layout` — fecha responsividade dos fluxos combinados.

Após cada merge, atualize a branch seguinte sobre `upstream/main` mais os commits aceitos, resolva conflitos sem copiar conteúdo de campanha e repita a revisão de segredo/diff.

## Pull Requests preparados

### 1. Add generic campaign themes

#### Summary

Add campaign-scoped themes with reusable generic presets.

#### Motivation

Campaigns need independent visual identity without changing global application styles or exposing unpublished drafts.

#### Changes

- Add `CampaignTheme` and `ThemePreset` persistence.
- Add validated theme editor, preview, import/export, duplicate, publish, apply and restore actions.
- Add generic RPG Studio, Medieval Fantasy and Cyberpunk presets.
- Keep drafts separate from published snapshots.

#### Technical Details

Theme configuration is validated with Zod and rendered as CSS custom properties. Image values are limited to internal paths or approved image data URLs.

#### Testing

See branch validation results in the table above; no result is claimed before execution.

#### Database Changes

Migration `20261124150000_campaign_themes` adds `CampaignTheme`, `ThemePreset`, `Campaign.activeThemeId`, indexes and foreign keys.

#### Breaking Changes

None identified; migration is additive.

#### Dependencies / Limitations

Requires PostgreSQL migration. Large assets should use object storage in a future contribution.

### 2. Add generic 3DeT Victory support

#### Summary

Add a generic 3DeT Victory system preset, character-sheet fields, rulebook summary and contextual roller.

#### Motivation

The studio needs system-level support without embedding campaign content or redistributing protected book text.

#### Changes

- Add `THREEDET_VICTORY` to `SystemType`.
- Add pure calculations for resources, builds, dice, opposed tests, damage and experience.
- Add rules page and adaptive sheet integration.

#### Database Changes

Migration `20261124100000_add_3det_victory` adds the enum value with no row rewrite.

#### Dependencies

Submit after `feat/campaign-themes` because the prepared branch follows the historical dependency chain.

### 3. Add encyclopedia document editor modes

#### Summary

Add read, visual-editing and Markdown modes to the file editor.

#### Changes

Add `DocumentEditor`, Markdown conversion/outline helpers, focus mode, entity links and lazy panel loading.

#### Testing / Limitations

Markdown behavior is covered by unit tests. The parser is intentionally limited and browser-level editing still needs manual validation.

### 4. Optimize RPG Studio data loading

#### Summary

Reduce redundant data loading and add opt-in timing diagnostics.

#### Changes

Use shared service queries, parallelize independent reads, lazy-load heavy client panels, add `CampaignFile` indexes and instrument server routes/Prisma queries.

#### Performance Results

No before/after benchmark is claimed. Use `docs/PERFORMANCE.md` to collect reproducible results.

#### Database Changes

Migration `20261124170000_add_campaign_file_list_indexes` adds two non-destructive indexes.

### 5. Render file explorers with initial data

#### Summary

Pass server-loaded file explorer data into the client to reduce first-load duplication.

#### Dependencies

Requires the data-loading service contract from PR 4.

### 6. Improve responsive campaign layouts

#### Summary

Contain campaign shell, file grids, editor and shared controls across narrow viewports.

#### Changes

Adjust CSS Modules and responsive markup without changing domain contracts.

#### Screenshots

None claimed; browser capture was not produced as part of this audit.

## Fork-only content

O Sangue de Arashi, its narrative, visual identity, preset, names, documents, seeds and private environment remain exclusively on `main` and are not part of the prepared branches. `.env.local`, `.vercel/` and credentials are not tracked. The public fork history already contains the campaign preset in the original commits; this is a publication risk that should be handled by repository owners with an explicit history-rewrite decision, not by this audit.

## Human review required

- Confirm license and contribution terms with upstream maintainers.
- Confirm whether chained PRs or squashed PRs are preferred.
- Review the public history risk before publishing any branch.
- Run isolated PostgreSQL migrations and integration tests.
- Perform authenticated browser checks for themes, 3DeT, editor and responsive layouts.
