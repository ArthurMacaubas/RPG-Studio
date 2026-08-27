# QUADRO 02.1 — Diagnóstico de evidência mista

**Projeto:** RPG Campaign Studio
**Incremento:** Correção da regra `HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE`
**Status final:** **APROVADO**
**Data:** 27 de agosto de 2026

## 1. Objetivo e causa-raiz

O QUADRO 02 havia sido publicado com uma falha lógica na regra `HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE`. A implementação anterior emitia o diagnóstico quando existia qualquer evidência `CONTRADICTS`, mesmo que não houvesse evidência `SUPPORTS`. Isso produzia falso positivo em hipóteses com somente evidência contrária, especialmente em hipóteses `REFUTED`.

O objetivo deste marco foi corrigir exclusivamente essa condição e seus testes, preservando a severidade, os IDs estáveis, a ordenação determinística, a explicação, a ação de revisão e as demais regras do serviço.

> Uma hipótese tem evidência mista somente quando a mesma hipótese possui pelo menos uma evidência `SUPPORTS` e pelo menos uma evidência `CONTRADICTS`.

## 2. Escopo executado

A função pura `computeInvestigativeDiagnostics` passou a derivar `supports` e `contradicts` a partir de uma cópia ordenada das evidências, sem mutar a entrada. O diagnóstico misto é emitido somente com a condição `supports.length > 0 && contradicts.length > 0`.

O status da hipótese não é usado como bypass. A regra funciona da mesma forma para hipóteses `OPEN`, `SUPPORTED` e `REFUTED`, desde que ambos os stances estejam presentes. Nenhuma outra regra, severidade, texto funcional, ação, contrato ou comportamento foi alterado.

| Item | Resultado |
| --- | --- |
| Regra corrigida | `HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE` exige `SUPPORTS` e `CONTRADICTS`. |
| Pureza | A entrada continua sem mutação. |
| Determinismo | IDs e ordem continuam estáveis em execuções repetidas. |
| Severidade | Mantida como `warning`. |
| Ação | Mantida como `Revisar hipóteses`. |
| Persistência | Nenhuma. |
| Superfície | Nenhuma alteração de UI, painel, rota ou API. |

## 3. Arquivos alterados

| Arquivo | Alteração |
| --- | --- |
| `src/services/investigativeDiagnostics.ts` | Condição do diagnóstico misto corrigida para exigir os dois stances. |
| `src/services/investigativeDiagnostics.test.ts` | Testes de ausência, presença única, status, explicação, ação e quantidade correta atualizados/ampliados. |
| `QUADRO_02_ERGONOMIA_DIAGNOSTICOS_RELATORIO.md` | Falso positivo, regra correta e validação 02.1 registrados no relatório do Quadro 02. |
| `QUADRO_02_1_DIAGNOSTICO_MISTO_RELATORIO.md` | Este relatório técnico. |

Não foram alterados schema, migrations, importação/exportação, banco, scripts PostgreSQL, rotas, APIs, publicação, Modo Jogador, Área do Jogador, editor, filtros, painel, dependências ou qualquer superfície de sessão.

## 4. Cobertura de testes

Os testes foram escritos para confirmar presença e ausência do código, incluindo quantidade exata quando o diagnóstico deve existir.

| Cenário | Resultado verificado |
| --- | --- |
| Somente `CONTRADICTS` | Não emite diagnóstico misto. |
| Somente `SUPPORTS` | Não emite diagnóstico misto. |
| `CONTRADICTS` + `CONTEXT` | Não emite diagnóstico misto. |
| `SUPPORTS` + `CONTEXT` | Não emite diagnóstico misto. |
| `SUPPORTS` + `CONTRADICTS` | Emite exatamente um diagnóstico misto. |
| Diagnóstico misto válido | Mantém severidade, explicação e ação de revisão. |
| Status `OPEN`, `SUPPORTED` e `REFUTED` com ambos os stances | Emite exatamente um diagnóstico misto em cada status. |
| `REFUTED` com somente `CONTRADICTS` | Não emite falso positivo misto nem falta de contradição. |
| `SUPPORTED` sem `SUPPORTS` | Emite somente `SUPPORTED_HYPOTHESIS_WITHOUT_SUPPORT` no cenário isolado. |
| Pureza e estabilidade | Mantém a entrada intacta e IDs/ordem idênticos em execuções repetidas. |

A suíte focada passou com **1 arquivo e 8 testes**. A suíte completa passou com **44 arquivos e 271 testes**.

## 5. Gates de validação

Todos os comandos obrigatórios foram executados em sequência e concluídos com sucesso.

| Gate | Resultado |
| --- | --- |
| `pnpm exec prisma generate` | Passou |
| `pnpm exec prisma format --check` | Passou |
| `pnpm exec prisma validate` | Passou |
| `pnpm exec tsc --noEmit -p .` | Passou |
| `pnpm lint` | Passou |
| `pnpm exec vitest run --pool=forks --maxWorkers=1 --reporter=dot` | Passou — 44 arquivos / 271 testes |
| `pnpm build` | Passou — build de produção concluído |
| `git diff --check` | Passou |

Não houve execução de migration, script PostgreSQL, fixture, alteração de dados ou validação manual no browser, conforme exigido pelo escopo da correção pura.

## 6. Revisão de segurança e autorização

A revisão do diff confirmou que não foram adicionados ou expostos URL PostgreSQL, host, usuário, senha, tokens, chaves privadas, arquivos `.env`, dumps ou dados de campanhas. O arquivo `.env` local permanece ignorado e não foi incluído na entrega.

Como o marco somente altera uma função pura e seus testes, não há mudança de autorização nem nova superfície de dados. As fronteiras existentes permanecem intactas: diagnósticos são administrativos e OWNER-only; PLAYER, P1–P4, links públicos e Modo Jogador não recebem esse conteúdo.

## 7. Decisão e limite do marco

O marco está **APROVADO** porque a causa-raiz foi corrigida, os cenários obrigatórios estão cobertos e todos os gates passaram. A aprovação é restrita ao QUADRO 02.1 e não representa aprovação de funcionalidades futuras.

A recuperação operacional de sessões e qualquer novo marco permanecem fora desta entrega e não devem ser iniciados até o aceite formal do QUADRO 02.1, conforme o prompt recebido.
