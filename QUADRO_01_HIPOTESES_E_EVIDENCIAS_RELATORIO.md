# Quadro 01 — Hipóteses e Evidências

**Status: APROVADO**

**Data da validação:** 25 de agosto de 2026.

## Escopo entregue

O Quadro de Investigação recebeu uma área administrativa de **Hipóteses e Evidências**. Uma hipótese é material provisório do Mestre e não altera, infere ou substitui `CampaignFile`, `Relationship`, `BoardNode` ou `BoardEdge`. Evidências são fichas existentes vinculadas à hipótese com uma posição explícita: `SUPPORTS`, `CONTRADICTS` ou `CONTEXT`.

A entrega não iniciou filtros salvos, auto-layout, múltiplos quadros, snapshots, Compilador, overlays oficiais de grafo, Modo Jogador ou projeção pública.

## Pré-condição e migration

O relatório vigente do Marco 3 foi verificado como **APROVADO** antes da alteração. A evolução foi implementada em migration independente e aditiva, sem backfill, reset, drop, seed ou alteração da migration do M3.

Foram criados os enums `HypothesisStatus` (`OPEN`, `SUPPORTED`, `REFUTED`, `RESOLVED`) e `EvidenceStance` (`SUPPORTS`, `CONTRADICTS`, `CONTEXT`), além de `InvestigationHypothesis` e `HypothesisEvidence`. A hipótese possui FK obrigatória para `Campaign` com cascata; a evidência possui FKs para hipótese e ficha com cascata; a unicidade `[hypothesisId, fileId]` impede a mesma ficha duas vezes na mesma hipótese; e os índices de campanha/estado, hipótese/posição/ordem e ficha foram criados.

A migration `20260825082500_investigation_hypotheses` foi aplicada **somente no PostgreSQL de teste confirmado**. O arquivo `.env` local não faz parte dos artefatos entregues.

## Autorização e privacidade

Todas as operações de hipóteses e evidências passam pelo guard `OWNER`. O serviço carrega a hipótese por `id + campaignId` e confirma que a ficha vinculada pertence à mesma campanha e não está na lixeira antes de criar uma evidência. PLAYER, link público e sessão ausente seguem o contrato HTTP público já existente, sem exposição de `error.message`, títulos, resumos, notas, IDs ou conteúdo de evidência.

A projeção do Modo Jogador não foi alterada e não serializa hipóteses. A exportação administrativa inclui `investigation.hypotheses` como seção opcional; documentos legados sem essa seção continuam válidos. A importação valida enums, títulos, datas, duplicidades e referências, remapeia `fileId` depois da criação das fichas e aborta antes do commit se uma referência não puder ser remapeada. A configuração de Modo Jogador continua sendo importada desligada.

## Experiência administrativa

O editor do Quadro ganhou um painel lateral responsivo com criação, edição, mudança de estado, remoção, busca textual local e filtro por estado. As evidências aparecem agrupadas por posição, com contadores favoráveis/contrárias/contextuais, nota curta, reordenação, remoção e busca de fichas existentes.

Quando uma evidência já possui `BoardNode`, a ação foca o nó e aplica destaque temporário. Quando está fora do canvas, o painel oferece ação explícita para adicioná-la pelo fluxo existente, sem criar nó duplicado. A seleção de uma hipótese destaca somente fichas presentes no quadro e nunca cria arestas persistentes. Foram preservados labels, navegação por teclado, foco visível, contraste e `prefers-reduced-motion`.

## Testes e validações locais

A validação local foi executada antes da aplicação da migration no banco. Os resultados foram:

| Verificação | Resultado |
| --- | --- |
| Prisma generate | Passou |
| Prisma format --check | Passou |
| Prisma validate | Passou |
| TypeScript `tsc --noEmit -p .` | Passou |
| ESLint em `src` | Passou sem warnings ou erros |
| Vitest | 24 suítes e 167 testes aprovados |
| Build Next.js | Compilado com sucesso |
| Testes focados de hipóteses/exportação/importação/rota | 6 suítes e 43 testes aprovados |

A cobertura nova inclui guard OWNER, 401/403 sem vazamento, validação de referência e duplicidade, criação/edição/remoção, exportação, importação com remapeamento, compatibilidade legada e preservação da curva do `BoardEdge`.

## Validação PostgreSQL de teste

A conexão usada nesta etapa apontou para o banco de teste confirmado e não é documentada neste relatório. A migration foi aplicada com `prisma migrate deploy`, sem operações destrutivas. A sequência exigida foi concluída integralmente:

| Etapa | Resultado |
| --- | --- |
| `db:smoke` | Passou; consulta de saúde e contagens retornadas |
| `test:db:relationship-constraint` | Passou |
| `test:db:integrity` | Passou com rollback verificado |
| `test:db:roundtrip` | Passou |
| `test:db:hypotheses` | Passou com round-trip administrativo e unicidade `[hypothesisId, fileId]` |

O harness de hipóteses cria apenas fixtures temporárias, testa exportação, importação `REMAP`, remapeamento de `fileId` e rejeição de duplicidade por `P2002`, e remove somente os próprios dados em `finally`.

## Limitações preservadas

O domínio continua administrativo. Não existe leitura, serialização ou tela de hipóteses no Modo Jogador, link público ou projeção pública. Não há inferência automática a partir de relacionamentos oficiais, conversão de evidência em `Relationship`, persistência de destaque visual, novos quadros, filtros avançados ou snapshots.

## Evidência visual

O fluxo administrativo, a fronteira OWNER e o bloqueio de serialização para jogador/público estão representados em [QUADRO_01_FLUXO_ADMINISTRATIVO.png](./QUADRO_01_FLUXO_ADMINISTRATIVO.png), gerado a partir de `QUADRO_01_FLUXO_ADMINISTRATIVO.mmd`.

## Conclusão

O Quadro 01 foi implementado e validado com sucesso. A migration foi aplicada exclusivamente em banco PostgreSQL de teste confirmado. A execução foi encerrada neste marco; nenhum módulo posterior foi iniciado.
