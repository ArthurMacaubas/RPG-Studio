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

  it('detecta hipótese sustentada sem SUPPORTS e contradição entre evidências', () => {
    const input = base({
      hypotheses: [{
        id: 'h-supported',
        title: 'Hipótese sustentada',
        status: 'SUPPORTED',
        evidence: [evidence('e-1', 'f-1', 'CONTRADICTS'), evidence('e-2', 'f-2', 'CONTEXT')]
      }],
      files: [file('f-1'), file('f-2')]
    });
    expect(issueCodes(input)).toEqual(['HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE', 'SUPPORTED_HYPOTHESIS_WITHOUT_SUPPORT']);

    const contradictory = base({
      hypotheses: [{
        id: 'h-conflict',
        title: 'Hipótese conflitante',
        status: 'OPEN',
        evidence: [evidence('e-2', 'f-2', 'CONTRADICTS')]
      }],
      files: [file('f-2')]
    });
    expect(issueCodes(contradictory)).toContain('HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE');
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
