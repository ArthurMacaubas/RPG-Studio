# Q05 — Decisão de modelagem de vistas salvas

## Decisão

As vistas salvas serão entidades próprias `InvestigationBoardView`, campaign-scoped, com `name`, `kind` (`SESSION`, `CASE` ou `ARC`), descrição opcional, ordem e um snapshot JSON validado. Não haverá FK para `Session`, pois a vista é uma configuração de navegação administrativa que pode representar um caso ou arco sem exigir uma sessão persistente.

O snapshot terá somente estado de navegação permitido: `pan`, `zoom`, filtros Q02, camadas Q02/Q04, `pinIds` e `groupIds`. Não armazenará cópias de nós, arestas, relações, arquivos, hipóteses ou evidências. A restauração aplica o snapshot ao estado local do editor e nunca chama endpoints de escrita do quadro.

Pins e grupos pertencem ao quadro administrativo, não à vista. A vista apenas referencia seus IDs para controlar o que o usuário deseja destacar. Ao carregar/restaurar, referências ausentes serão omitidas com aviso explicativo; não serão recriadas, convertidas em registros fantasmas ou usadas para alterar anotações canônicas.

## Justificativa

Uma entidade própria separa configuração de navegação do quadro canônico, permite ordenação e nomes únicos por campanha e evita sobrecarregar `BoardNode`, `BoardEdge`, `Relationship` ou `CampaignFile`. O snapshot limitado permite validar tamanho e estrutura com Zod, mantendo o formato auditável e reversível.

## Autorização e transferência

Listagem, criação, atualização, reordenação e remoção são OWNER-only e campaign-scoped. Vistas não serão consultadas por jogador ou público. Exportação/importação administrativa incluirá vistas como bloco opcional, com remapeamento de `pinIds` e `groupIds` por índices/identificadores exportados; documentos legados sem vistas continuarão válidos.

## Migration e rollback

A migration será aditiva e aplicada somente ao PostgreSQL isolado de teste depois de auditoria sem escrita, `prisma format`, `prisma validate` e revisão do SQL. O rollback lógico é remover a tabela nova somente por migration reversa autorizada no teste; a aplicação não executará reset, drop ou rollback automático.
