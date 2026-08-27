import { describe, expect, it } from 'vitest';
import { computeInvestigativeDiagnostics, type InvestigativeDiagnosticsInput } from './investigativeDiagnostics';

const file = (id: string, name = id, data: unknown = {}, extra: Partial<InvestigativeDiagnosticsInput['files'][number]> = {}) => ({
  id,
  name,
  type: 'CLUE' as const,
  isArchived: false,
  isTrashed: false,
  data,
  ...extra
});

function base(overrides: Partial<InvestigativeDiagnosticsInput> = {}): InvestigativeDiagnosticsInput {
  return {
    campaignId: 'campaign-1',
    files: [],
    hypotheses: [],
    importantRelationships: [],
    activeBoardFileIds: new Set(),
    boardPins: [],
    boardGroups: [],
    boardViews: [],
    ...overrides
  };
}

const evidence = (id: string, fileId: string, stance: 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXT', itemFile = file(fileId)) => ({ id, fileId, stance, file: itemFile });

function issueCodes(input: InvestigativeDiagnosticsInput) {
  return computeInvestigativeDiagnostics(input).map((issue) => issue.code);
}

describe('investigativeDiagnostics Q06', () => {
  it('detecta hipótese aberta sem evidência com regra e ação', () => {
    const [issue] = computeInvestigativeDiagnostics(base({ hypotheses: [{ id: 'h-open', title: 'Hipótese aberta', status: 'OPEN', evidence: [] }] }));
    expect(issue).toMatchObject({
      code: 'HYPOTHESIS_WITHOUT_EVIDENCE',
      severity: 'warning',
      entityIds: ['h-open'],
      action: { href: '/campaigns/campaign-1/investigacao' }
    });
  });

  it('detecta hipótese refutada sem CONTRADICTS e preserva a ausência de alerta quando há evidência contrária', () => {
    const withoutContradiction = base({ hypotheses: [{ id: 'h-refuted', title: 'Hipótese refutada', status: 'REFUTED', evidence: [evidence('e-context', 'f-context', 'CONTEXT')] }] });
    expect(issueCodes(withoutContradiction)).toContain('REFUTED_HYPOTHESIS_WITHOUT_CONTRADICTION');

    const withContradiction = base({ hypotheses: [{ id: 'h-refuted-ok', title: 'Hipótese refutada', status: 'REFUTED', evidence: [evidence('e-contradiction', 'f-contradiction', 'CONTRADICTS')] }] });
    expect(issueCodes(withContradiction)).not.toContain('REFUTED_HYPOTHESIS_WITHOUT_CONTRADICTION');
  });

  it('emite evidência mista somente quando a mesma hipótese tem SUPPORTS e CONTRADICTS', () => {
    const onlyContradicts = base({
      hypotheses: [{ id: 'h-only-contradicts', title: 'Somente contrária', status: 'OPEN', evidence: [evidence('e-1', 'f-1', 'CONTRADICTS')] }]
    });
    expect(issueCodes(onlyContradicts)).not.toContain('HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');

    const onlySupports = base({
      hypotheses: [{ id: 'h-only-supports', title: 'Somente favorável', status: 'OPEN', evidence: [evidence('e-2', 'f-2', 'SUPPORTS')] }]
    });
    expect(issueCodes(onlySupports)).not.toContain('HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');

    const contradictsAndContext = base({
      hypotheses: [{ id: 'h-contradicts-context', title: 'Contrária e contexto', status: 'OPEN', evidence: [evidence('e-3', 'f-3', 'CONTRADICTS'), evidence('e-4', 'f-4', 'CONTEXT')] }]
    });
    expect(issueCodes(contradictsAndContext)).not.toContain('HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');

    const supportsAndContext = base({
      hypotheses: [{ id: 'h-supports-context', title: 'Favorável e contexto', status: 'OPEN', evidence: [evidence('e-5', 'f-5', 'SUPPORTS'), evidence('e-6', 'f-6', 'CONTEXT')] }]
    });
    expect(issueCodes(supportsAndContext)).not.toContain('HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');

    const mixed = base({
      hypotheses: [{ id: 'h-mixed', title: 'Hipótese mista', status: 'OPEN', evidence: [evidence('e-7', 'f-7', 'CONTRADICTS'), evidence('e-8', 'f-8', 'SUPPORTS')] }]
    });
    const mixedIssues = computeInvestigativeDiagnostics(mixed);
    const mixedDiagnostics = mixedIssues.filter((issue) => issue.code === 'HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');
    expect(mixedDiagnostics).toHaveLength(1);
    expect(mixedDiagnostics[0]).toMatchObject({
      severity: 'warning',
      explanation: expect.any(String),
      action: { label: 'Revisar hipóteses', href: '/campaigns/campaign-1/investigacao' }
    });

    for (const status of ['OPEN', 'SUPPORTED', 'REFUTED'] as const) {
      const mixedForStatus = base({
        hypotheses: [{ id: `h-mixed-${status.toLowerCase()}`, title: `Mista ${status}`, status, evidence: [evidence(`e-${status}-support`, `f-${status}-support`, 'SUPPORTS'), evidence(`e-${status}-contradict`, `f-${status}-contradict`, 'CONTRADICTS')] }]
      });
      expect(issueCodes(mixedForStatus).filter((code) => code === 'HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE')).toHaveLength(1);
    }

    const refutedWithContradiction = base({
      hypotheses: [{ id: 'h-refuted-contradiction', title: 'Refutada', status: 'REFUTED', evidence: [evidence('e-9', 'f-9', 'CONTRADICTS')] }]
    });
    expect(issueCodes(refutedWithContradiction)).not.toContain('HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');
    expect(issueCodes(refutedWithContradiction)).not.toContain('REFUTED_HYPOTHESIS_WITHOUT_CONTRADICTION');

    const supportedWithoutSupport = base({
      hypotheses: [{ id: 'h-supported-without-support', title: 'Sustentada sem apoio', status: 'SUPPORTED', evidence: [evidence('e-10', 'f-10', 'CONTRADICTS')] }]
    });
    expect(issueCodes(supportedWithoutSupport)).toEqual(['SUPPORTED_HYPOTHESIS_WITHOUT_SUPPORT']);
  });

  it('detecta evidências ligadas a arquivo arquivado ou na lixeira', () => {
    const archived = file('f-archived', 'Arquivo arquivado', {}, { isArchived: true });
    const trashed = file('f-trashed', 'Arquivo na lixeira', {}, { isTrashed: true });
    const issues = computeInvestigativeDiagnostics(base({
      hypotheses: [{
        id: 'h-files',
        title: 'Hipótese',
        status: 'OPEN',
        evidence: [evidence('e-archived', archived.id, 'SUPPORTS', archived), evidence('e-trashed', trashed.id, 'CONTEXT', trashed)]
      }],
      files: [archived, trashed]
    }));
    expect(issues.filter((issue) => issue.code === 'EVIDENCE_FILE_UNAVAILABLE')).toHaveLength(2);
    expect(issues.every((issue) => issue.explanation && issue.action)).toBe(true);
  });

  it('detecta pista crítica sem hipótese e não alerta quando há vínculo', () => {
    const critical = file('critical', 'Pista crítica', { importance: 'CRITICAL' });
    expect(issueCodes(base({ files: [critical] }))).toContain('CRITICAL_CLUE_WITHOUT_HYPOTHESIS');
    expect(issueCodes(base({
      files: [critical],
      hypotheses: [{ id: 'h-linked', title: 'Hipótese', status: 'OPEN', evidence: [evidence('e-linked', critical.id, 'SUPPORTS', critical)] }]
    }))).not.toContain('CRITICAL_CLUE_WITHOUT_HYPOTHESIS');
  });

  it('detecta relação importante fora do quadro ativo e aceita relação completamente visível', () => {
    const relationship = {
      id: 'rel-important',
      fromId: 'f-from',
      toId: 'f-to',
      importance: 'IMPORTANT' as const,
      from: { id: 'f-from', name: 'Origem' },
      to: { id: 'f-to', name: 'Destino' }
    };
    expect(issueCodes(base({ importantRelationships: [relationship], activeBoardFileIds: new Set(['f-from']) }))).toContain('IMPORTANT_RELATIONSHIP_OUTSIDE_ACTIVE_BOARD');
    expect(issueCodes(base({ importantRelationships: [relationship], activeBoardFileIds: new Set(['f-from', 'f-to']) }))).not.toContain('IMPORTANT_RELATIONSHIP_OUTSIDE_ACTIVE_BOARD');
  });

  it('detecta referência de pin/grupo inválida em vista salva', () => {
    const issues = computeInvestigativeDiagnostics(base({
      boardPins: [{ id: 'pin-valid' }],
      boardGroups: [{ id: 'group-valid' }],
      boardViews: [{ id: 'view-1', name: 'Vista', snapshot: { pinIds: ['pin-valid', 'pin-missing'], groupIds: ['group-missing'] } }]
    }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'BOARD_ANNOTATION_REFERENCE_INVALID', severity: 'error', entityIds: ['view-1', 'pin-missing', 'group-missing'] });
  });

  it('ordena resultados por regra e ID de forma estável, sem mutar a entrada', () => {
    const input = base({
      files: [file('critical', 'Pista crítica', { critical: true })],
      hypotheses: [{ id: 'h-open', title: 'Aberta', status: 'OPEN', evidence: [] }]
    });
    const before = JSON.stringify(input);
    const first = computeInvestigativeDiagnostics(input);
    const second = computeInvestigativeDiagnostics(input);
    expect(first.map((issue) => issue.id)).toEqual(second.map((issue) => issue.id));
    expect(first.map((issue) => issue.code)).toEqual(['CRITICAL_CLUE_WITHOUT_HYPOTHESIS', 'HYPOTHESIS_WITHOUT_EVIDENCE']);
    expect(JSON.stringify(input)).toBe(before);
  });
});
