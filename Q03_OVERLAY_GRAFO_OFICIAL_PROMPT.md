# Q03 — Overlay do grafo oficial

## Estado de entrada

Q02 está aprovado. O Quadro administrativo já possui filtros locais e reversíveis, busca por fichas, filtros de importância/visibilidade de `Relationship`, camadas visuais separadas e contadores canônicos. `BoardEdge` continua sendo somente visual; `Relationship` continua sendo a relação oficial; hipóteses/evidências continuam administrativas e não inferem nem criam relações.

## Objetivo do próximo marco

Implementar, exclusivamente no Quadro administrativo, o overlay visual do grafo oficial alimentado por `relationshipsApi.graph`, com distinção inequívoca dos fios `BoardEdge`, aplicação dos filtros e camadas existentes, foco/seleção acessível e estados vazios explicativos. O overlay não deve alterar relações, criar arestas visuais automaticamente, alterar publication policy ou aparecer no jogador/público.

## Riscos a resolver antes do código

A direção, a visibilidade por papel e os endpoints de uma relação devem permanecer coerentes com `relationshipService` e sua política server-side. O overlay não pode tratar ausência de uma relação no payload como exclusão canônica, misturar tipos de aresta, duplicar linhas ou capturar eventos destinados ao canvas. O comportamento em zoom, pan, responsividade, foco por teclado e `prefers-reduced-motion` precisa ser validado sem persistir estado de visualização.

## Critérios de aceite

| Critério | Aceite |
|---|---|
| Fonte | O desenho usa somente o grafo oficial retornado pelo contrato administrativo existente |
| Separação | `Relationship` e `BoardEdge` têm aparência, legenda, seleção e ações distintas |
| Segurança | Jogador e público não recebem o overlay nem dados administrativos adicionais |
| Filtros | Importância, visibilidade, escopo e camadas do Q02 são respeitados sem novas consultas por busca local |
| Interação | Foco, seleção, Escape e navegação por teclado são acessíveis e não criam/alteram relações |
| Integridade | Nenhuma migration, publicação, inferência ou criação automática de `BoardEdge` |
| Validação | Testes puros/contratuais, typecheck, lint, suíte, build e captura autenticada do Quadro |

Não iniciar o próximo marco até confirmar novamente este gate e registrar plano, riscos e estratégia de reversão.
