# QUADRO 01.1 — Integração do painel de Hipóteses ao canvas

**Status do QUADRO 01: APROVADO**

**Data:** 25 de agosto de 2026.

## Escopo

O painel administrativo de Hipóteses e Evidências foi verificado e integrado ao editor real do Quadro de Investigação. A toolbar possui ação explícita `Hipóteses`, o painel pode ser recolhido e o canvas permanece a área principal do workspace. Nenhuma alteração foi feita em `schema.prisma`, migrations, services, rotas, importação/exportação, Modo Jogador, Compilador, Relationship, filtros salvos, auto-layout, snapshots ou múltiplos quadros.

## Estado auditado e correções

O editor já continha a integração estrutural do painel no estado encontrado, mas a execução deste quadro corrigiu diretamente apenas os pontos permitidos: callbacks estabilizados com `useCallback`, `boardFileIds` mantido como `Set` memoizado, limpeza de destaque ao fechar/desmontar o painel, foco com zoom moderado e propagação de falha da adição ao canvas para o painel.

`onFocusFile` apenas move a câmera para um `BoardNode` existente e aplica foco temporário; quando a ficha está fora do canvas, o painel informa explicitamente que ela precisa ser adicionada. `onAddToBoard` verifica duplicidade, usa `boardApi.dropFile` no centro visível, atualiza o estado local e rejeita a promessa em caso de erro. `onHighlightFiles` filtra os IDs pelos nós presentes e altera apenas a apresentação do canvas.

Não há criação de `BoardNode`, `BoardEdge` ou `Relationship` durante o destaque de evidências. A rota de investigação do jogador não importa nem renderiza `HypothesesPanel`.

## Testes focados

A configuração existente do Vitest usa ambiente Node e `jsx: preserve`, sem uma ferramenta de renderização montada. Em conformidade com o prompt, foi usado teste focado por contrato do host com leitura das fontes e mocks/fixtures das APIs, sem adicionar dependências.

| Caso | Resultado |
| --- | --- |
| Host importa/renderiza painel e fornece campaignId | Aprovado |
| `boardFileIds` é `Set` memoizado | Aprovado |
| Callbacks `onFocusFile`, `onAddToBoard` e `onHighlightFiles` são estabilizados | Aprovado |
| Toggle administrativo e limpeza de destaque | Aprovado |
| Adição sem duplicação e sem Relationship | Aprovado |
| Separação da rota de jogador | Aprovado |
| Hipótese/evidência e importação/exportação | Aprovado |
| Testes focados | 3 suítes e 11 testes aprovados |

## Validação local

A bateria completa foi executada antes do banco:

| Verificação | Resultado |
| --- | --- |
| Prisma generate | Passou |
| Prisma format --check | Passou |
| Prisma validate | Passou |
| TypeScript `tsc --noEmit -p .` | Passou |
| ESLint em `src` | Passou sem warnings ou erros |
| Vitest completo | 25 suítes e 171 testes aprovados |
| Build Next.js | Compilado com sucesso |

## PostgreSQL isolado

Com a variável de ambiente apontando exclusivamente para o banco de teste confirmado, foi executado o script já entregue:

```text
RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1 pnpm run test:db:hypotheses
```

O teste passou com round-trip administrativo, remapeamento de `fileId` e unicidade `[hypothesisId, fileId]`. O harness criou e removeu apenas fixtures temporárias. Nenhuma migration nova, reset, drop, seed não aprovado ou limpeza global foi executada nesta etapa.

## Evidência visual

A captura [QUADRO_01_1_PAINEL_EVIDENCIA_DESTACADA.webp](./QUADRO_01_1_PAINEL_EVIDENCIA_DESTACADA.webp) foi realizada na rota administrativa autenticada do Quadro. Ela mostra o painel aberto, a hipótese sintética selecionada, a evidência `Símbolo na parede` agrupada em `SUPPORTS` e o nó existente destacado no canvas.

Para não deixar resíduos na campanha de teste, a hipótese e a evidência sintéticas foram removidas após a captura. A campanha voltou ao estado sem hipótese aberta.

## Limitações preservadas

O destaque é temporário e visual. Evidências não são convertidas em relações oficiais, não geram arestas persistentes e não aparecem no Modo Jogador, em links públicos ou em payloads públicos. A execução foi encerrada após este quadro; nenhum módulo posterior foi iniciado.

## Conclusão

O QUADRO 01.1 foi validado e o **QUADRO 01 está APROVADO**. A integração administrativa está acessível no editor real, mantém o canvas funcional e respeita a separação de domínio, privacidade e persistência definida anteriormente.
