# V17 — Auditoria de Integridade e Segurança de Relacionamentos

## Escopo examinado

Foram revisados o schema Prisma, as seis migrations existentes, o core
`Relationship`/`RelationshipType`, `relationshipService`, as rotas de
relacionamento, `RelationshipManager`, os guards de acesso, o Modo Jogador, a
transferência JSON, o Compilador e o adaptador de erros de API.

## Achados críticos

| Área | Estado V16 | Risco ou lacuna V17 |
|---|---|---|
| Leitura individual e por entidade | `get()` e `getForEntity()` validam apenas acesso à campanha. | Um membro pode receber relação `GM` e referências a entidades sem acesso quando consome esses endpoints autenticados. |
| Grafo oficial | `getGraph()` devolve todos os arquivos não descartados e todas as relações da campanha para qualquer membro. | Há vazamento de nós, relações e metadados privados. |
| Lista do jogador | `listForPlayer()` filtra `ALL` e IDs fornecidos pelo chamador. | A regra não é reutilizada pelas demais consultas, portanto a política diverge. |
| Modo Jogador | As páginas pública/autenticada já filtram relação `ALL` e as duas pontas visíveis. | A consulta é duplicada fora do core e não suporta audiência individual por membro. |
| Unicidade | Há `findFirst()` antes de `create()`, e apenas índice não único no banco. | Requisições concorrentes ainda podem criar duplicatas. |
| Direção | `RelationshipType.directional` é persistido, mas o gerenciador sempre usa setas de entrada/saída. | Relações não direcionais não têm apresentação consistente. |
| JSON | Metadados V16 são exportados, mas o ID de `Relationship` não é serializado e tipos personalizados não incluem ID. | O round-trip não pode registrar identidade original nem preparar uma restauração futura. |
| Legado | `kind` segue em schema, rotas e JSON. | É necessário mantê-lo apenas como espelho de compatibilidade, sem nova regra de negócio. |

## Decisão de audiência individual

O prompt V17 exige `ALL`, `GM`, `P1`, `P2`, `P3` e `P4`, mas a V16 não possui
um identificador persistente de audiência em `CampaignMember`. Para aplicar
essa política no backend sem depender de nome ou posição de interface, a V17
deve introduzir um slot opcional e único por campanha no membro, por exemplo
`PLAYER_1` a `PLAYER_4`, e ampliar `RelationshipVisibility` com os mesmos
valores. O Mestre permanece `OWNER`; jogadores sem slot só recebem `ALL`.

## Estratégia segura

A V17 seguirá uma migration aditiva. Antes da constraint de unicidade, será
executada uma consulta de diagnóstico no Neon para contar duplicatas por
`campaignId`, `fromId`, `toId` e `typeId`. Registros não serão apagados
silenciosamente: se houver duplicatas, a migration manterá o registro mais
antigo, transferirá os metadados ausentes de forma conservadora e registrará a
resolução no próprio SQL. Se não houver duplicatas, apenas a constraint será
criada.

As consultas de leitura passarão por um filtro comum que combina papel,
audiência, visibilidade de arquivo, arquivo arquivado/descartado e grants. Para
usuários não autorizados, relações e entidades não visíveis serão tratadas como
inexistentes (`404`) para não revelar sua presença.
