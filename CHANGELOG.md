# Changelog

Registro de alterações verificadas no histórico Git local. Não representa releases publicados.

## Unreleased

### Added

- Temas por campanha com rascunho, publicação, aplicação, presets e validação.
- Suporte ao 3DeT Victory, ficha adaptativa, rolagem e regra resumida.
- Editor de documentos com leitura, edição visual, Markdown, sumário e links entre entidades.
- Telemetria opt-in de rotas, operações server-side e consultas Prisma.
- Exploração de arquivos com dados iniciais server-rendered.
- Índices compostos para listagens de arquivos.

### Changed

- Shell da campanha e listas de arquivos passaram a aceitar carregamento inicial e consultas compatíveis paralelas.
- Páginas e componentes receberam contenção responsiva.

### Fixed

- Contenção do editor de documentos, controles compartilhados e grids em larguras menores.

### Improved

- Redução de consultas redundantes e carregamento sob demanda de painéis pesados.
- Instrumentação reproduzível para tempo de rota, operação e consulta.

### Security

- Imagens de tema permanecem limitadas por schema, tipo MIME e tamanho no endpoint.

### Database Changes

- `20261124150000_campaign_themes`: `CampaignTheme`, `ThemePreset` e tema ativo.
- `20261124100000_add_3det_victory`: enum aditivo `SystemType.THREEDET_VICTORY`.
- `20261124170000_add_campaign_file_list_indexes`: índices compostos de `CampaignFile`.

### Deprecated / Removed

- Nenhuma remoção de funcionalidade registrada nesses commits.
