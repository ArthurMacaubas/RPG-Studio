# Mapas de campanha

## Estado atual

Mapas continuam sendo `CampaignFile` do tipo `MAP`, preservando conteúdo, publicação, grants e anexos existentes. A rota `/campaigns/[id]/mapa/[fileId]` adiciona uma superfície própria com imagem de mídia `MAP`, zoom por roda, pan, ajuste, fullscreen e interface responsiva. A página `/mapa` continua sendo o explorador filtrado, agora abrindo essa superfície.

Marcadores e camadas são armazenados em `CampaignFile.data.map`, para não migrar nem substituir mapas existentes. Coordenadas `x` e `y` são percentuais da área renderizada da imagem, preservadas ao aplicar zoom/pan, letterbox e redimensionar a superfície. Camadas possuem nome, opacidade, visibilidade, ordem e acesso; marcadores possuem nome, descrição, categoria, cor, camada, visibilidade e relações. No modo edição, marcadores podem ser criados, arrastados, configurados e excluídos sem sair do mapa. O serviço remove marcadores e camadas privadas do payload de jogador, em vez de depender só da ocultação no navegador.

## Permissões e navegação

O acesso ao mapa usa as mesmas guards de arquivo/publicação. Edição, criação de camada e criação/edição de marcador ficam disponíveis apenas ao OWNER. Um marcador pode selecionar uma entidade ou mapa relacionado, e o visualizador oferece navegação quando esses valores estão presentes. Zoom e pan são preservados por mapa em `sessionStorage` ao navegar e voltar na mesma sessão. A imagem do mapa continua privada até que seu asset e o mapa vinculador estejam publicados.

## Limitações deliberadas

Linhas, polígonos e círculos básicos são persistidos no mesmo payload compatível do mapa, com camada, descrição e visibilidade. Ainda não há edição de vértices, agrupamento de marcadores, preferências individuais persistidas de camada, migração de coordenadas por troca de proporção nem carregamento segmentado. Essas capacidades devem ganhar modelos/rotas próprios e validação Zod antes de ampliarem o editor atual.

## Performance

O canvas não pré-carrega outros mapas ou documentos vinculados. A imagem usa `object-fit: contain`, transform CSS e eventos de pointer; marcadores são dados pequenos do mapa atual. Antes de introduzir tiling ou níveis de resolução, medir tamanho de mapas, memória, INP e abertura em dispositivo real.
