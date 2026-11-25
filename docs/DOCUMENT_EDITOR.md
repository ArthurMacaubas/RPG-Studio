# Editor de documentos e imagens

O editor mantém Markdown como formato persistido e usa `markdownToHtml`/`htmlToMarkdown` como ponte visual. Imagens no texto são Markdown padrão, com URLs internas `/api/media/[id]` permitidas pelo sanitizador ao lado de URLs HTTP(S) e data URLs legadas. O seletor de mídia da barra de ferramentas vincula o asset ao arquivo e insere a imagem sem trocar de página.

Referências `COVER` e `PRIMARY` são independentes. A capa é responsiva e usa a mídia explícita quando presente; sem ela, o primeiro anexo de imagem legado continua servindo como fallback. A lateral permite escolher largura padrão/ampla, imagem principal lateral, altura, posição e comportamento de recorte da capa; as preferências ficam em `CampaignFile.data.mediaLayout` e documentos antigos continuam no padrão. `GALLERY` permite reutilização, legenda e ordem persistida, sendo renderizada na leitura com grade responsiva e visualização ampliada. Todas as imagens do texto e da galeria podem abrir no lightbox com Escape, zoom, arraste, fullscreen e navegação por teclado entre itens da galeria.

O modo leitura, edição visual e Markdown preservam o documento e usam o mesmo auto-save já existente. O editor não aceita HTML arbitrário para layout de imagem, alinhamento ou texto contornado; isso evita serialização frágil e CSS fornecido pelo usuário. A barra lateral oferece edição de legenda, ordem por controles acessíveis e também arrastar e soltar; os controles continuam disponíveis como alternativa de teclado.

Documentos anteriores não precisam de campos de mídia e continuam funcionais. O modo jogador só recebe mídia publicada vinculada a um documento que também tenha passado pela política de publicação/grant.
