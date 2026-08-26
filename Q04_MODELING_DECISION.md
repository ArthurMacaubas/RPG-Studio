# Q04 — Decisão de modelagem

## Decisão

Pins e agrupamentos visuais serão entidades próprias do workspace administrativo, em vez de novas colunas em `BoardNode` ou campos no payload de `CampaignFile`. A auditoria confirmou que o quadro atual contém apenas posição de nós e fios visuais, sem metadados equivalentes para texto curto, cor, tamanho ou composição de grupos.

Serão adicionados `InvestigationBoardPin`, `InvestigationBoardGroup` e `InvestigationBoardGroupItem`. O pin terá `campaignId`, texto curto, posição e cor. O grupo terá `campaignId`, nome, cor, posição, largura e altura. O item de grupo terá `campaignId`, `groupId` e `boardNodeId`, com unicidade por grupo/nó e relações compostas que impedem referências cross-campaign no banco.

A decisão mantém as fronteiras de domínio: um pin ou grupo não é `CampaignFile`, `Relationship`, `BoardEdge`, hipótese ou evidência. O grupo referencia somente nós já existentes do quadro; não copia conteúdo e não cria novos nós. A remoção de um `BoardNode` remove seus itens de grupo por cascata, enquanto a remoção de um grupo remove somente sua composição visual.

## Justificativa

Entidades próprias permitem evolução aditiva, validação de tamanho e cor, autorização OWNER-only e exportação administrativa explícita sem sobrecarregar o modelo canônico de arquivo ou converter raciocínio visual em fato. A composição por `BoardNode` preserva a posição canônica do quadro e evita duplicar conteúdo. Os dados ficam naturalmente excluídos das projeções de jogador/públicas porque nenhum serviço de publicação os consulta.

## Migração e reversão

A migration será aditiva e aplicada primeiro somente no PostgreSQL isolado de teste confirmado. Antes da aplicação, `prisma format`, `prisma validate` e uma revisão do SQL gerado serão executados. Como os modelos são novos e a auditoria encontrou as tabelas Q04 ausentes, não há dados legados para conversão.

O rollback lógico do marco consiste em remover as tabelas novas e os campos de relação do schema por migration reversa somente se necessário e somente no ambiente de teste autorizado; a implementação não deve usar reset, drop global ou limpeza de dados. O código deve continuar sem executar rollback destrutivo automaticamente.

## Limites

Este modelo não inclui vistas salvas, auto-layout, caminhos, diagnósticos, sessões, briefing, storage ou centro de backup completo. A extensão de export/import conterá apenas pins e grupos administrativos, com remapeamento de IDs de nós; nenhuma exportação pública/player será alterada.

## Auditoria prévia

A auditoria somente leitura encontrou as tabelas baseline do quadro e das relações presentes, as tabelas propostas Q04 ausentes e nenhum dado Q04 existente que exigisse saneamento. O resultado foi registrado sem imprimir database name, host, URL, IDs ou credenciais.
