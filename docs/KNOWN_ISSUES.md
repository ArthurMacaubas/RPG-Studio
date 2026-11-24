# Problemas conhecidos

| Item | Severidade | Impacto | Prioridade | Estado | Próximo passo |
|---|---|---|---|---|---|
| Upstream sem licença/contributing/code of conduct versionados | média | impede afirmar termos de redistribuição | alta | aberto | confirmação humana dos mantenedores |
| Rate limit em memória | média | proteção inconsistente em múltiplas réplicas | alta | conhecido | armazenamento compartilhado |
| Data URLs para uploads | média | payload e custo crescem com imagens | média | conhecido | object storage com política de acesso |
| Ausência de benchmarks versionados | baixa | ganhos de performance não têm baseline histórico | média | aberto | executar procedimento de `PERFORMANCE.md` |
| Configuração Vercel/Neon externa ao repositório | média | deploy não é reproduzível apenas pelo Git | média | conhecido | documentar configuração sem secrets |
| Conteúdo da campanha na branch principal | alta | risco de exposição em branches/PRs | alta | protegido por branches preparadas | revisar diff e histórico antes de publicar |
| Testes de browser não automatizados no checkout | média | cobertura visual e de interação limitada | média | aberto | adicionar harness separado e seguro |
