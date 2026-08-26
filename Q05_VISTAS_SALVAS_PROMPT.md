# Prompt de transição — Q05: Vistas salvas por sessão, caso ou arco

Q04 está **APROVADO**. Inicie Q05 somente após ler `Q04_PINS_NOTAS_GRUPOS_RELATORIO.md`, `Q04_MODELING_DECISION.md`, `todo.md`, o schema/migration Q04, os serviços de quadro/anotações e os contratos de exportação/importação.

Implemente exclusivamente vistas salvas administrativas do Quadro. Cada vista deve representar uma configuração nomeada de navegação — sessão, caso ou arco — sem duplicar nem alterar `BoardNode`, `BoardEdge`, `Relationship`, `CampaignFile`, hipótese, evidência, pin ou grupo canônico. Defina e documente antes da migration o pertencimento das vistas e a política para referências a pins/grupos removidos ou ausentes.

O gate exige modelagem campaign-scoped, autorização OWNER-only, restauração segura e reversível de pan/zoom, filtros/camadas e referências visuais autorizadas. A restauração deve ser uma operação local de estado e não pode criar, mover, excluir ou editar dados canônicos do quadro. Exportação/importação administrativa pode receber vistas somente com remapeamento explícito e compatibilidade legada; jogador/público não pode receber vistas administrativas.

Cubra validação de nome, limites de payload, duplicidade por campanha, referências inválidas, ordenação, exclusão e restauração. Adicione testes puros/contratuais e, se houver migration, aplique apenas de forma aditiva no PostgreSQL isolado de teste após auditoria sem escrita. Valide Prisma, TypeScript, lint, Vitest, build, integração de banco específica e captura autenticada. Não antecipe Q06 (diagnósticos/Compilador), Q07 (auto-layout/caminhos), Q08+ ou qualquer mudança de publicação.

Ao terminar, escreva `Q05_VISTAS_SALVAS_RELATORIO.md`, crie o prompt de Q06, atualize `todo.md`, registre riscos/rollback e só então avance. Em qualquer falha de gate, banco ou compatibilidade, pare em Q05 e documente o bloqueio.
