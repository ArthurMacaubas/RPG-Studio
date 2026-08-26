# Q04 — Pins, notas e agrupamentos visuais do quadro

## Estado de entrada

Q01.1, Q02 e Q03 estão aprovados. O Quadro administrativo possui hipóteses/evidências integradas, filtros e camadas locais e overlay readonly do grafo oficial. `CampaignFile` continua conteúdo canônico; `Relationship` continua fonte oficial; `BoardEdge` continua fio visual; evidências/hipóteses e os novos elementos visuais não podem criar ou editar fatos oficiais. O componente do jogador e o público não recebem superfícies administrativas.

## Objetivo do próximo marco

Implementar somente pins, notas curtas e agrupamentos visuais persistidos para organização do raciocínio do Mestre. Um grupo deve poder ter nome, cor, posição/tamanho e itens de quadro; um pin deve poder ter texto curto, posição e cor. Todas as operações são OWNER-only e campanha-scoped.

## Gate obrigatório antes do código

Ler este prompt, o relatório de Q03, o schema, migrations, `boardService`, rotas de board, contratos de export/import e `publicationPolicy`. Executar auditoria sem escrita no PostgreSQL isolado de teste confirmado. Antes da migration, documentar se os dados pertencem ao quadro existente ou exigem entidades próprias. Se a auditoria encontrar dados incompatíveis, marcar `BLOQUEADO — dados incompatíveis` e não sanear automaticamente.

## Riscos e limites

A modelagem não pode ser escolhida silenciosamente entre colunas no quadro e novas entidades. A migration deve ser aditiva, revisada e aplicada primeiro somente ao banco de teste. Pins/notas/grupos não são `CampaignFile`, `Relationship`, `BoardEdge` ou evidência. Referências a nós/arquivos devem ser validadas na mesma campanha e removidas ou rejeitadas conforme o contrato documentado. Não implementar vistas salvas, diagnósticos, auto-layout, sessões, briefing, rate limiting, object storage ou centro de backup completo neste marco.

Exportação administrativa pode receber apenas as referências necessárias, sem alterar exportação pública/player. Qualquer integração com backup deve respeitar o contrato existente e não expor os elementos ao jogador. Não executar reset, drop, seed amplo, limpeza global ou operação de produção.

## Critérios de aceite

| Critério | Aceite |
|---|---|
| Persistência | Pins e grupos são criados, editados e removidos por rotas/service OWNER-only e campanha-scoped |
| Modelagem | Decisão documentada e migration aditiva aplicada somente no PostgreSQL de teste |
| Grupo | Nome, cor, posição/tamanho e itens do quadro persistem com referências válidas |
| Pin | Texto curto, posição e cor persistem com validação de tamanho |
| Separação | Nenhum pin/nota/grupo cria arquivo, relação oficial, aresta ou evidência |
| Segurança | Player/público e exportação pública não recebem conteúdo administrativo |
| Integridade | Referências cross-campaign e IDs inexistentes são rejeitados; remoção não deixa referências inválidas |
| UX | OWNER tem criação, edição, remoção e foco acessíveis por teclado, com estados de erro/vazio claros |
| Validação | Auditoria sem escrita, migration/testes PostgreSQL de teste, testes unitários/contratuais, typecheck, lint, suíte, build e captura autenticada |

## Testes obrigatórios

Executar os scripts padrão de banco aplicáveis somente com `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1`, acrescentando a suíte específica de pins/grupos. Cobrir autorização OWNER/PLAYER, escopo de campanha, validação de referências, persistência/rollback, exportação administrativa e ausência no payload público/player. Registrar comandos e resultados sem segredos.

Ao concluir, gerar `Q04_PINS_NOTAS_GRUPOS_RELATORIO.md`, atualizar `todo.md`, criar o prompt de Q05 e um checkpoint. Se qualquer validação falhar ou a infraestrutura/banco de teste não estiver confirmada, parar em Q04 e entregar relatório de bloqueio/falha.
