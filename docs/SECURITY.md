# Segurança

## Implementado

- Sessões persistidas com cookie HTTP-only e hash do token no banco.
- Guards de campanha e papel OWNER/PLAYER no backend.
- Filtros server-side para publicação, grants, visibilidade e audiência.
- Validação Zod de entradas de API e configuração de temas.
- Escape HTML, URLs limitadas e links externos com `rel="noreferrer"` no Markdown.
- Rate limiting em memória em fluxos de autenticação/convite.
- CSP e headers de proteção em `middleware.ts`.
- `.env*` locais ignorados; somente `.env.example` é versionado.

## Temas e uploads

Uploads de tema são limitados a PNG/JPEG/GIF/WebP e 600 KB. A configuração aceita caminhos internos ou data URLs de imagem permitidas. Isso reduz superfície de script, mas data URLs aumentam payload e não são storage de produção.

## Riscos e limitações

- Rate limiting em memória não é suficiente para múltiplas réplicas; use armazenamento compartilhado antes de escalar.
- O repositório não possui varredura de dependências ou política de disclosure versionada.
- Não há `SECURITY.md` no upstream atual.
- O checkout contém conteúdo exclusivo da campanha; branches de upstream devem ser revisadas por diff e busca de strings antes de publicar.

Não há vulnerabilidade não corrigida descrita publicamente neste documento. Relatos reais devem ser enviados privadamente aos mantenedores, sem abrir detalhes exploráveis em issue pública.
