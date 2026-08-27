import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const panel = readFileSync(new URL('./SessionContextPanel.tsx', import.meta.url), 'utf8');
const sessionsPage = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const playerInvestigation = readFileSync(new URL('../jogador/investigacao/page.tsx', import.meta.url), 'utf8');
const playerMode = readFileSync(new URL('../modo-jogador/page.tsx', import.meta.url), 'utf8');

describe('QUADRO 03 — contexto administrativo de sessão', () => {
  it('integra planejamento existente e ações de continuidade sem criar nova fonte de verdade', () => {
    expect(sessionsPage).toContain('SessionPlanningPanel');
    expect(panel).toContain('Contexto investigativo da sessão');
    expect(panel).toContain('Objetivos');
    expect(panel).toContain('Roteiro');
    expect(panel).toContain('Checklist');
    expect(panel).toContain('Resumo pós-sessão');
    expect(panel).toContain('Retomar planejamento');
    expect(panel).toContain('onSelectPlan(previousPlan.id)');
    expect(panel).not.toContain('sessionPlansApi.create');
    expect(panel).not.toContain('sessionPlansApi.update');
    expect(panel).not.toContain('sessionPlansApi.remove');
  });

  it('oferece deep links administrativos para fichas, hipóteses e vistas e trata referências indisponíveis', () => {
    expect(panel).toContain('Abrir ficha');
    expect(panel).toContain('Focar no quadro');
    expect(panel).toContain('Abrir hipótese no quadro');
    expect(panel).toContain('Abrir vista no quadro');
    expect(panel).toContain('isArchived');
    expect(panel).toContain('isTrashed');
    expect(panel).toContain('Sem foco no quadro');
    expect(panel).toContain('encodeURIComponent(file.id)');
    expect(panel).toContain('encodeURIComponent(hypothesis.id)');
    expect(panel).toContain('encodeURIComponent(view.id)');
  });

  it('limita relações às fichas vinculadas e mantém a apresentação readonly', () => {
    expect(panel).toContain('relationshipsApi.graph(campaignId, linkedFileIds)');
    expect(panel).toContain('selectContextRelationships(graph, linkedFileIdSet)');
    expect(panel).toContain('leitura sem edição');
    expect(panel).not.toContain('relationshipsApi.create');
    expect(panel).not.toContain('relationshipsApi.update');
    expect(panel).not.toContain('relationshipsApi.remove');
  });

  it('mantém o painel fora das superfícies de jogador e modo jogador', () => {
    expect(playerInvestigation).not.toContain('SessionContextPanel');
    expect(playerMode).not.toContain('SessionContextPanel');
  });
});
