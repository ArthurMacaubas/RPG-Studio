# V15 — Combate, ameaças e hardening de origem

## Migração e modelo de domínio

A V15 foi precedida por `prisma validate` e `prisma migrate status` contra o
Neon configurado. O banco estava atualizado antes da mudança. A migration
`20260820024711_add_combat_encounters` foi revisada localmente, aplicada pelo
comando `prisma migrate deploy`, confirmada por `prisma migrate status` e teve
o Prisma Client regenerado.

| Decisão | Implementação |
|---|---|
| Ameaça | `THREAT` foi acrescentado ao enum `FileType`. A ficha permanece no `data` de `CampaignFile`, preservando editor, tags, anexos, histórico, relacionamentos, favoritos, publicação e grants. Não foi criada uma tabela exclusiva de ameaça. |
| Encontro | `CombatEncounter` mantém campanha, vínculo opcional à `Session`, status, rodada, turno e timestamps. Ele pode existir sem sessão para suportar um combate avulso. |
| Participante | `CombatParticipant` mantém uma cópia operacional de nome, iniciativa, HP, condições, ordem e visibilidade, com referência opcional ao `CampaignFile` de origem. Isso preserva o histórico do combate quando a ficha é editada depois. |
| Integração futura | A referência ao `CampaignFile` mantém o combate conectável ao Compilador e ao Quadro sem forçar uma relação nova nesta versão. |

## Operação de combate

O `combatService` exige papel `OWNER` para criação, leitura administrativa,
início, avanço, encerramento e alterações de participantes. As mutações geram
auditoria; alterações de HP também registram um `FileHistoryEntry` quando o
participante possui arquivo de origem. As rotas delegam exclusivamente ao
serviço e a interface chama a API apenas por `src/lib/api.ts`.

A Sala de Sessão agora contém o painel de encontro. O Mestre pode selecionar
personagens e ameaças já existentes, ajustar iniciativa, iniciar o encontro,
avançar o turno, controlar a rodada, aplicar dano/cura de um ponto, salvar
condições e decidir se cada participante aparece para jogadores.

## Visão do jogador

A área autenticada do jogador mostra apenas um combate em andamento quando o
Modo Jogador está ativo. A lista respeita `isVisibleToPlayers`; todos os HP e
condições ficam ocultos, exceto para um `CHARACTER` cuja ficha de origem está
visível pelo mesmo filtro de publicação/grant e cujo `authorId` pertence ao
jogador atual. Fichas de ameaça nunca expõem HP por essa rota.

## Rate limiting

`TRUST_PROXY_HEADERS` é `false` por padrão. Nessa condição,
`x-forwarded-for` e `x-real-ip` são ignorados, impedindo que uma conexão direta
forje uma origem a cada requisição. O valor só deve ser ativado por trás de um
proxy confiável que substitua os headers de origem. Além dos contadores por IP
e e-mail, a V15 bloqueia uma nova origem quando o mesmo e-mail ultrapassa quatro
IPs distintos na janela de 15 minutos. O mecanismo segue em memória por
instância e deve migrar para armazenamento compartilhado antes de escalar
horizontalmente.
