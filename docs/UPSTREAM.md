# Relação com o upstream

## Estado auditado

- Fork: `https://github.com/ColdHC/RPG-Studio-Cold.git` (`origin`).
- Upstream: `https://github.com/ArthurMacaubas/RPG-Studio.git` (`upstream`).
- Branch principal do upstream: `main`.
- Ancestral comum verificado: `9efa7403ecde896640eda9ebe31356e2e8b16c08`.
- Estado auditado da fork: 7 commits à frente do `upstream/main`, sem commits exclusivos do upstream no fetch realizado.
- Backup local: `backup-main-before-audit-2026-11-24`.

## Fluxo de sincronização

```bash
git fetch upstream --prune
git log --oneline --left-right upstream/main...main
git diff --name-status upstream/main..main
```

Não use force push, reset destrutivo ou reescrita de `main`. Antes de trocar de branch, verifique `git status --short --branch` e preserve alterações locais.

## Contribuições preparadas

As branches locais são encadeadas porque o histórico real possui dependências:

1. `feat/campaign-themes`
2. `feat/three-det-victory`
3. `feat/document-editor`
4. `perf/rpg-studio-data-loading`
5. `perf/file-explorer-server-render`
6. `fix/responsive-layout`

O preset e a identidade de O Sangue de Arashi não entram nessas branches. Para atualizar uma branch após aprovação de uma dependência, rebaseie ou reaplique seus commits sobre a nova base em uma cópia de trabalho e revise o diff; não altere a branch principal da fork.
