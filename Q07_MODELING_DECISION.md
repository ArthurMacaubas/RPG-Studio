# Q07 — Decisão de modelagem: auto-layout e caminhos

**Status:** decisão pré-implementação  
**Escopo:** somente visualização e posições de `BoardNode`; nenhuma nova fonte de verdade.

## Auditoria sem escrita

O Quadro atual lê `BoardNode` e `BoardEdge` por campanha. O drag manual modifica o estado local e persiste cada nó no `mouseup` por `PATCH /api/board/nodes/[fileId]`. A rota valida números finitos e o serviço revalida a campanha do nó antes da escrita. Essa chamada por nó não oferece preview/cancelamento nem atomicidade para um layout calculado; por isso, Q07 não reutilizará o `mouseup` para o preview.

`Relationship` é consultado separadamente como fonte oficial. `BoardEdge` é editável e visual, portanto não será usado como fonte do caminho. Hipóteses/evidências têm serviço administrativo próprio e são somente uma origem visual explicitamente rotulada. Filtros, camadas, pins/grupos e vistas Q05 são estados administrativos separados; o auto-layout não os persiste nem os altera.

O modelo `BoardNode` possui `fileId` único, `campaignId`, `x` e `y`. Como o recurso precisa salvar apenas posições já existentes, nenhuma migration é necessária. Será adicionado um serviço transacional de posições com autorização OWNER, validação dos `fileId` pertencentes à campanha e rejeição de nós ausentes/duplicados. A gravação ocorrerá somente depois da confirmação explícita do preview.

## Algoritmo de auto-layout

O algoritmo puro será determinístico e limitado a no máximo 120 nós. Ele preserva o conjunto e os IDs de entrada, ordena nós por nome normalizado e ID, cria camadas por grau de entrada em relações oficiais e posiciona cada camada em uma grade vertical/horizontal com espaçamento fixo. Ciclos e nós não alcançáveis caem em uma camada final ordenada, sem inferir relação nova. O resultado é apenas `{ nodeId, x, y }` e não contém nomes, conteúdo ou novos edges.

O preview mantém uma cópia das posições originais e uma cópia das posições propostas no estado do componente. Cancelar descarta apenas a proposta e restaura a cópia local. Confirmar envia a lista inteira ao endpoint transacional, que atualiza exclusivamente os `BoardNode` existentes da campanha. Falha na confirmação preserva a proposta local e informa erro seguro; não há escrita parcial.

## Modelo de caminhos

O caminho oficial usa somente `Relationship` retornada pela API do grafo e somente endpoints que correspondam a `BoardNode` do canvas. A busca é BFS determinística: vizinhos são ordenados por ID, a profundidade máxima é 12 e o número máximo de caminhos é 12. Relações direcionais seguem `sourceId → targetId`; relações não direcionais permitem os dois sentidos. Nenhum `BoardEdge` participa da busca.

O modo evidencial usa a hipótese selecionada e suas evidências válidas. Ele não cria uma relação factual: cada par consecutivo na ordem de evidência vira um segmento de visualização marcado `EVIDENCE`, com a legenda “Evidência da hipótese — não é relação oficial”. Se houver menos de dois nós válidos, o resultado é explicitamente vazio. O usuário pode selecionar a origem e o destino; quando o modo combina fontes, o resultado oficial continua distinguido do segmento evidencial.

Caminhos e segmentos vivem no estado local. Filtros/camadas não são escritos. Ausência de caminho, endpoints fora do quadro, ciclo e limite atingido recebem estado explicativo. A origem dos dados (`RELATIONSHIP` ou `HYPOTHESIS_EVIDENCE`) permanece em cada segmento e na legenda.

## Acessibilidade e segurança

O painel de layout/caminhos será alcançável por teclado, terá foco visível, botão de cancelar e `Escape` para fechar preview. Não serão adicionadas animações contínuas; qualquer transição existente seguirá `prefers-reduced-motion`. O recurso será renderizado apenas no editor administrativo. O serviço e a rota bulk exigirão `OWNER`; `PLAYER`, público e Modo Jogador continuarão sem importação ou API de layout/caminhos internos.

## Gates de Q07

Não há migration, provider externo ou dependência nova prevista. Se o endpoint bulk exigir alteração de integridade fora do modelo existente, ou se a API não conseguir validar campanha/OWNER atomicamente, Q07 será marcado **BLOQUEADO** em vez de contornar com escrita client-side. O aceite exige preview/cancelamento, confirmação explícita, caminhos com origem rotulada, testes determinísticos e validação local completa.
