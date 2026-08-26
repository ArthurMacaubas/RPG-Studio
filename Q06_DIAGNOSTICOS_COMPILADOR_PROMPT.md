# Prompt de transição — Q06: Diagnósticos investigativos e integração com o Compilador

Q05 está **APROVADO** em `Q05_VISTAS_SALVAS_RELATORIO.md`. Antes de alterar o projeto, leia também `Q05_MODELING_DECISION.md`, `Q05_BROWSER_FINDINGS.md`, `todo.md`, o schema/migration Q05, `boardViewService`, `campaignTransferService`, o Compilador existente, suas rotas, tipos, testes e a política de publicação.

## Objetivo

Oferecer alertas determinísticos, explicáveis e acionáveis sobre inconsistências do raciocínio investigativo do Mestre, integrando-os ao Compilador administrativo sem alterar automaticamente qualquer dado.

## Escopo permitido

Implemente somente diagnósticos do domínio investigativo e a integração administrativa OWNER-only com o Compilador. Cada diagnóstico deve conter, no mínimo, código estável, severidade, mensagem pública segura, explicação da regra, entidades afetadas e ação ou destino de correção quando houver uma superfície existente. A ordem dos resultados deve ser determinística e os resultados devem ser reproduzíveis para o mesmo estado de campanha.

As regras mínimas a cobrir são:

| Regra | Condição determinística |
| --- | --- |
| Hipótese aberta sem evidência | Hipótese com status `OPEN` sem evidências vinculadas. |
| Hipótese sustentada sem suporte | Hipótese com status `SUPPORTED` sem evidência de stance `SUPPORTS`. |
| Evidências contraditórias | Hipótese que contém ao menos uma evidência com stance `CONTRADICTS`; se também houver `SUPPORTS`, o mesmo diagnóstico explicita o conflito entre as duas posições. |
| Evidência indisponível | Evidência vinculada a arquivo arquivado ou na lixeira. |
| Pista crítica sem hipótese | Pista crítica ativa que não participa de nenhuma hipótese aplicável. |
| Relação oficial fora do quadro ativo | Relação oficial importante cujo nó de origem ou destino não está no quadro ativo. A relação não deve ser criada, corrigida ou inferida pelo diagnóstico. |
| Referência inválida de anotações | Pin ou grupo com referência inexistente, removida ou incompatível com a campanha, conforme o contrato de Q04/Q05. |

Não use IA, inferência livre, heurística não documentada ou sugestões que possam ser interpretadas como fatos oficiais. O diagnóstico apenas aponta a condição observada. Não criar, editar, remover, mover ou publicar `CampaignFile`, `Relationship`, `BoardNode`, `BoardEdge`, hipótese, evidência, pin, grupo ou vista automaticamente.

## Integração com o Compilador

O Compilador permanece **OWNER-only**. A integração deve consumir diagnósticos por contrato explícito, preservar o relatório existente e indicar a origem da regra. PLAYER, link público e qualquer resposta de publicação não podem receber diagnósticos, pistas internas, hipóteses, evidências, pins, grupos, vistas ou dados privados do Compilador.

Ações e links devem apontar somente para superfícies existentes e autorizadas, por exemplo a hipótese, a ficha, o Quadro ou a tela de anotações. Não crie uma ação de correção se ela não puder ser executada de forma segura e explícita. Links não devem incluir dados sensíveis além dos identificadores necessários na rota autorizada; mensagens e erros públicos devem seguir `apiErrorResponse` e nunca ecoar detalhes internos.

## Gate antes da implementação

Faça uma auditoria sem escrita do Compilador atual: entradas, regras, contrato de saída, autorização, chamadas de banco, exposição ao jogador/público e cobertura de testes. Registre um plano de integração e os riscos antes de alterar o código.

Não crie migration ou dependência nova sem demonstrar necessidade. Se uma migration, serviço compartilhado ou infraestrutura incompatível for necessária e não houver compatibilidade comprovada no ambiente de teste, marque **BLOQUEADO** e pare. Não use `migrate reset`, `DROP`, seed amplo, limpeza global, reparo manual ou banco de produção/compartilhado.

## Testes e validação obrigatória

Cada regra deve ter teste determinístico de caso positivo e negativo, incluindo campanha sem dados, entidade arquivada/lixeira, ausência de nós no quadro, referências inválidas e ordenação estável. Cubra autorização OWNER/P1–P4/link público/sem sessão nos endpoints ou funções acessíveis, garantindo que o jogador e o público não recebem diagnósticos.

Execute, quando aplicável, `pnpm exec prisma generate`, `pnpm exec prisma format --check`, `pnpm exec prisma validate`, `pnpm exec tsc --noEmit -p .`, `pnpm exec next lint --dir src`, `pnpm exec vitest run --run` e `pnpm run build`. Se houver migration ou teste de banco, revise a SQL, aplique somente no PostgreSQL isolado com guards `RUN_DB_TESTS=1 INTEGRATION_TEST_DATABASE=1`, e sanitize toda saída.

Valide também teclado, foco, `Escape`, responsividade, `prefers-reduced-motion`, estado vazio, carregamento, erro e que nenhuma busca repetida ou loop de renderização foi introduzido. Não iniciar Q07, auto-layout, caminhos de pistas, Q08 ou qualquer funcionalidade posterior nesta etapa.

## Entrega

Ao terminar, escreva `Q06_DIAGNOSTICOS_COMPILADOR_RELATORIO.md`, atualize `todo.md`, registre migration/rollback/riscos e crie o prompt do próximo quadrante somente se Q06 for aprovado. Declare explicitamente **APROVADO**, **FALHOU** ou **BLOQUEADO**. Pare no primeiro gate que falhar; não avance para Q07 nesse caso.
