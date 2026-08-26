# V14 — Segurança de acesso e consistência de visibilidade

## Escopo entregue

Esta versão endurece os três fluxos que recebem entrada sensível sem substituir
autenticação, convites ou Modo Jogador já existentes. Nenhum modelo Prisma foi
alterado e nenhuma migration foi criada ou aplicada.

| Área | Entrega |
|---|---|
| Login e registro | Limite local progressivo por IP e por e-mail, com bloqueio inicial de 60 segundos após cinco falhas no intervalo de 15 minutos e escalonamento até 30 minutos. Uma autenticação bem-sucedida limpa a contagem associada. |
| Aceite de convite | Mesmo limite por IP; quando há sessão identificável, também por e-mail do usuário atual. Tentativas bloqueadas retornam `429`, `Retry-After` e `Cache-Control: no-store`. |
| Headers | Middleware global com CSP compatível com assets locais e data URLs, além de `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, isolamento de opener e HSTS apenas em produção. |
| Prévia por jogador | A rotina `previewForMember()` continua usando o filtro de servidor de publicação, lixeira, arquivamento e grants. Ela funciona mesmo com o Modo Jogador pausado e exige acesso de escrita do Mestre. |
| Favoritos | A obtenção ou criação da pasta padrão foi extraída para uma função que retorna `Promise<string>`, eliminando a variável opcional antes da chamada a `addFile()`. |

## Cobertura adicionada

Os testes unitários cobrem o bloqueio após falhas, o escalonamento progressivo e
a limpeza de estado do rate limiter. Também cobrem a prévia do Mestre para um
jogador, verificando que a consulta reaproveita a mesma condição de publicação
e grant, inclusive com o Modo Jogador pausado.

## Limitação operacional conhecida

O rate limiting é intencionalmente **em memória por instância**, adequado ao
modo de instância única e sem nova dependência de infraestrutura. Em uma futura
implantação horizontal, o armazenamento dos contadores deve migrar para Redis,
Upstash ou mecanismo equivalente compartilhado entre réplicas.

## Banco Neon

Foi executado `prisma validate` antes de iniciar a V14. A variável
`DATABASE_URL` presente neste ambiente não contém um URL PostgreSQL válido, e
por isso `prisma migrate status` não pôde consultar o Neon. Como a V14 não muda
o schema, não houve tentativa de aplicar migrations. No ambiente de produção,
[URL/credencial de banco redigida neste histórico]
`npx prisma migrate status` antes do deploy.
