# Q08 — Decisão de modelagem do planejamento de sessões

## Contexto auditado

O projeto possui dois conceitos ativos. `CampaignFile` com `type = SESSION` é o conteúdo visível no acervo e é usado pela página de Sessões, pela Sala de Sessão e pelo fluxo de publicação. O modelo Prisma `Session` é um agregado relacional separado, utilizado por `CombatEncounter`, pelo dashboard, pela transferência e pelo vínculo legado `SessionFile`, mas ainda não possui uma superfície administrativa própria para planejamento completo.

A auditoria confirmou que `SessionCommandCenter` atualmente lista arquivos de sessão, lê `data.checklist` e grava esse JSON pelo endpoint genérico de arquivos. Esse fluxo deve permanecer compatível. A evolução Q08 não converterá automaticamente todos os arquivos SESSION em registros `Session`, não removerá o checklist legado e não tornará planejamento administrativo publicável.

## Decisão

Q08 estenderá o modelo Prisma `Session` com campos administrativos limitados: `objectives` e `agenda` como listas JSON estruturadas, `postSummary` opcional, `status` com estados `PLANNED` e `COMPLETED`, e `completedAt` opcional. O campo existente `summary` e o `checklist` JSON serão preservados para compatibilidade; o novo serviço validará e normalizará o checklist antes de persistir.

Serão criadas duas tabelas de junção próprias: `SessionHypothesis`, para vínculos com `InvestigationHypothesis`, e `SessionBoardView`, para vínculos com `InvestigationBoardView`. O vínculo com fichas continuará usando `SessionFile`, já existente. Cada junção usará chave composta e índices de apoio. O serviço verificará que a sessão e o recurso referenciado pertencem à mesma campanha antes de qualquer escrita; essa regra não será delegada a IDs enviados pelo cliente.

A sessão continuará sendo campaign-scoped e todas as alterações serão OWNER-only. Os textos de objetivos, roteiro e resumo não serão copiados para fichas, hipóteses ou vistas. Abrir uma vista e destacar uma hipótese serão ações de leitura/navegação no cliente; não haverá mutação automática do Quadro.

## Compatibilidade e transferência

A exportação incluirá os campos administrativos novos e os vínculos usando IDs de origem apenas dentro do documento administrativo. A importação fará remapeamento de sessão, arquivos, hipóteses e vistas em uma única transação. Documentos legados sem os campos Q08 serão tratados como listas vazias, status `PLANNED` e ausência de vínculos. Referências ausentes ou cross-campaign serão rejeitadas na validação, nunca silenciosamente convertidas em registros fantasmas.

## Limites e rollback

Objetivos e roteiro terão no máximo 20 itens cada, com rótulo não vazio de até 240 caracteres. O checklist terá no máximo 80 itens, cada rótulo com até 240 caracteres e ordem estabilizada pelo índice. O resumo pós-sessão terá no máximo 20.000 caracteres. A transação de importação e as operações de vínculo impedem estados parciais.

A migration será aditiva: enum, campos nullable/default e tabelas de junção novas. O rollback de schema será documentado somente depois da revisão do SQL gerado e da aplicação no PostgreSQL isolado de teste. Em caso de falha antes da aprovação, não haverá alteração no banco de produção/compartilhado e Q08 ficará **BLOQUEADO** ou **FALHOU**, conforme o gate afetado.

## Não-escopo

Não haverá briefing ou timeline publicado, não haverá exposição de objetivos, roteiro, checklist, resumo, hipóteses privadas ou vistas administrativas para PLAYER/P1–P4 ou link público, e não haverá nova infraestrutura, IA, armazenamento de objetos, rate limiting ou backup nesta etapa.
