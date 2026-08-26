# RPG Campaign Studio — V9 multimídia

## Entregas

A V9 adiciona editores persistentes de habilidades e inventário no JSON da ficha, rolagens contextuais para Ordem Paranormal e D&D 5e, upload de imagens de até 5 MB, miniaturas e galerias no editor e nas visões do jogador, busca global autorizada, compartilhamento autenticado e conexões curvas no Quadro de Investigação.

A tela de edição de arquivo reutiliza `AttachmentsPanel` para todos os tipos, portanto personagens, NPCs, locais e mapas podem receber URL de imagem ou upload. A imagem enviada passa por validação de MIME e tamanho na rota `/api/files/[id]/attachments/upload` e é armazenada como data URL no anexo. A solução não exige bucket externo, mas uploads grandes e vídeos devem continuar sendo mantidos em storage externo.

## Banco

A migration `prisma/migrations/0003_board_edge_curve/migration.sql` adiciona `BoardEdge.curve` como `DOUBLE PRECISION NOT NULL DEFAULT 0`. Execute `npx prisma migrate deploy` com a `DATABASE_URL` real do PostgreSQL/Neon.

## Rotas novas

| Rota | Função |
|---|---|
| `POST /api/files/[id]/attachments/upload` | Upload protegido de imagem de até 5 MB |
| `GET /api/search?q=...` | Busca global autorizada por campanha e arquivo |
| `GET /api/campaigns/[id]/player-view` | Visão autenticada dos arquivos publicados |
| `/campaigns/[id]/jogador` | Biblioteca autenticada do jogador |

## Validação

A validação foi executada com sucesso usando uma URL sintética somente para leitura do schema Prisma, pois o sandbox não expôs `DATABASE_URL` real:

- `npx prisma format`
- `npx prisma validate`
- `npx tsc --noEmit -p .`
- `npx next lint --dir src`
- `npm test -- --run`
- `npm run build`

A migration não foi aplicada ao Neon neste ambiente por ausência da conexão real.
