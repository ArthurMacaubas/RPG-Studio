# Mídia por campanha

## Arquitetura

`MediaAsset` guarda metadados e permissões no PostgreSQL; o arquivo original fica no armazenamento de objetos. `MediaReference` associa um asset reutilizável a `CampaignFile` com propósito (`COVER`, `PRIMARY`, `CONTENT`, `GALLERY`, `MAP` ou `MARKER`). Essa separação evita duplicar bytes quando a mesma imagem aparece em documentos, entidades ou mapas.

O adaptador atual é `src/lib/mediaStorage.ts`, baseado em Vercel Blob privado. Novos arquivos são entregues por `/api/media/[assetId]`, que exige sessão e revalida campanha, publicação do asset e publicação/grant do arquivo referenciador antes de transmitir bytes. URLs do Blob não são persistidas nem entregues ao browser.

## Configuração

Crie/conecte um Blob Store privado na Vercel e configure `BLOB_READ_WRITE_TOKEN` para runtime autenticado. Ajustes opcionais: `MEDIA_MAX_IMAGE_BYTES`, `MEDIA_MAX_UPLOAD_FILES` e `MEDIA_MAX_IMAGE_PIXELS`. Sem essa variável a biblioteca permanece navegável, mas upload retorna 503 com instrução explícita; não há fallback para filesystem temporário ou Base64.

## Upload, formatos e custos

O servidor lê assinatura e dimensões reais antes do upload, aceita PNG/JPEG/GIF/WebP e rejeita SVG e conteúdo ativo. O limite padrão é 10 MB, 10 arquivos por envio e 40 milhões de pixels. O upload atual passa pela rota Node para validar conteúdo; para arquivos grandes ou variantes geradas, prefira futuro upload direto assinado após medir custo/volume.

Ainda não há geração automática de thumbnails, conversão WebP/AVIF ou limpeza automática de órfãos. O original é preservado; cards e galeria usam lazy loading e dimensões reservadas. Não há estimativa de custo no checkout: armazenamento, transformações e transferência dependem do plano/configuração do Blob.

## Visibilidade e exclusão

Assets começam `PRIVATE`. A opção `PUBLISHED` não torna um arquivo acessível sozinha: jogadores também precisam conseguir ler algum `CampaignFile` vinculado. A exclusão é bloqueada quando há referências e informa as entidades afetadas. Remova/substitua as referências antes de excluir; o serviço remove o objeto do provider antes do registro no banco.

## Biblioteca e seletor

A biblioteca oferece grade/lista, upload múltiplo por arquivo ou drop, progresso, busca por nome/tags, filtros de categoria e MIME, ordenação e paginação. Metadados (nome, descrição, alt, categoria, tags e visibilidade) são editáveis; seleção em lote tenta excluir cada asset e preserva os que ainda possuem referências. O seletor reutilizável atende documentos, entidades e mapas, com busca, categoria, preview, upload e tratamento de erro sem sair da tela atual.

## Compatibilidade e manutenção

`Attachment` e data URLs existentes não são migrados nem alterados. A página de documento mantém o primeiro anexo de imagem como fallback de capa até uma referência `COVER` ser escolhida. Uma futura migração precisa copiar cada arquivo de modo reexecutável, registrar sucesso/falha, comparar referências e só então alterar metadados; ela não deve ser executada automaticamente em produção.
