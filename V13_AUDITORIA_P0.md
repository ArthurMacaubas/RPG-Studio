# V13 — Diagnóstico P0 incremental

## O que já existe e deve ser preservado

O repositório principal já possui uma base funcional relevante: autenticação própria, campanhas, conteúdo polimórfico por `CampaignFile`, tags, relacionamentos, favoritos, lixeira, Quadro com nós e conexões Bézier, Modo Jogador, grants individuais, auditoria, fichas adaptativas, construtor parcial de sistema personalizado, busca, importação/exportação e Sala de Sessão.

O modelo de conteúdo polimórfico e a camada `service → API → src/lib/api.ts` são a fonte de verdade e não devem ser substituídos. A landing page é um projeto separado e não será modificada nesta rodada.

## Achados objetivos

| Área | Estado atual | Decisão incremental |
|---|---|---|
| Permissões de arquivo | Implementadas por publicação e grant individual; há filtros em arquivos, busca, dashboard e Modo Jogador. | Reutilizar para uma prévia real “Ver como jogador”. |
| Modo Jogador | Possui curadoria, link público e rota autenticada. | Ampliar para que o Mestre selecione um jogador e confira o resultado do mesmo filtro de servidor. |
| Membros | Listagem e remoção segura já existem, com revogação de grants/convites e auditoria. | Reutilizar a lista; não criar uma entidade de membro paralela. |
| Sistemas de RPG | Ordem, D&D e CUSTOM existem; o construtor CUSTOM já administra atributos, perícias, classes e raças. | Considerar recursos, fórmulas e editor avançado como próxima fatia, pois exige expansão de modelo e UI. |
| Sala de Sessão | Cronômetro, checklist persistido, curadoria e auditoria existem. | Evolução de layouts e combate é uma fase posterior, pois combate ainda não possui modelo persistente. |
| Combate e ameaças | Não há modelos Prisma, services, endpoints ou tipos dedicados. | Não simular uma tela sem persistência; preparar como próxima fatia com migration confirmada no Neon. |
| Relações e Quadro | `Relationship`, `BoardNode` e `BoardEdge` existem e usam chaves estrangeiras. O Quadro diferencia o mapa visual do relacionamento de conteúdo, mas ainda não possui tipos explícitos de hipótese. | Manter a estrutura atual e tratar hipóteses como expansão de domínio posterior. |

## P0 selecionado nesta rodada

Implementar **“Ver como jogador” real por membro**, utilizando a mesma regra do servidor que filtra publicação e grants individuais. O recurso permitirá ao Mestre selecionar um jogador existente e receber um resumo dos arquivos e tags que esse membro efetivamente poderia acessar. A prévia não deve depender de ocultação no cliente e deve funcionar mesmo se o Modo Jogador estiver pausado, deixando claro que é uma simulação de autorização.

## Itens não recriados

Não recriar: autenticação, convites, CampaignMember, CampaignFile, grants, Modo Jogador, Quadro, fichas, busca, exportação, Sidebar, landing page ou identidade visual. A evolução será acoplada aos services e contratos existentes.

## Bloqueador conhecido

O banco Neon teve erro de credenciais `P1000` e histórico antigo divergente. Nenhuma migration será criada ou aplicada nesta fatia sem confirmar `DATABASE_URL`, `prisma validate` e `prisma migrate status` no ambiente correto.
