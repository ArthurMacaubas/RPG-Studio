import { describe, expect, it } from 'vitest';
import type { CampaignExportDocument } from '@/types';
import { dryRunCampaignImport, validateCampaignExportDocument } from './campaignTransferService';

const timestamp = '2026-08-25T12:00:00.000Z';

function documentWithPlan(): CampaignExportDocument {
  return {
    format: 'rpg-campaign-studio', version: 1, exportedAt: timestamp,
    campaign: { id: 'campaign-1', name: 'Campanha Q08', description: null, system: 'CUSTOM', coverImage: null },
    customSystem: { attributes: [], skills: [], classes: [], races: [] },
    files: [{ id: 'file-1', type: 'CLUE', name: 'Pista', description: null, content: null, authorId: null, data: {}, isFavorite: false, isArchived: false, isTrashed: false, trashedAt: null, createdAt: timestamp, updatedAt: timestamp, tags: [], attachments: [], comments: [], history: [] }],
    tags: [], relationships: [], favoriteFolders: [],
    sessions: [{
      id: 'session-1', name: 'Sessão 1', date: null, summary: 'Resumo',
      checklist: [{ id: 'check-1', label: 'Abrir a cena', done: false }],
      objectives: [{ id: 'objective-1', label: 'Descobrir a pista', done: false }],
      agenda: [{ id: 'agenda-1', label: 'Abertura', done: false }],
      postSummary: null, status: 'PLANNED', completedAt: null, order: 0,
      fileIds: ['file-1'], hypothesisIds: ['hypothesis-1'], viewIds: ['view-1']
    }],
    timelineEvents: [], board: {
      nodes: [], edges: [], views: [{ id: 'view-1', name: 'Vista', kind: 'SESSION', description: null, order: 0, snapshot: {
        pan: { x: 0, y: 0 }, zoom: 1,
        filters: { search: '', fileType: 'ALL', tagIds: [], scope: 'active', favoritesOnly: false, relationshipImportance: 'ALL', relationshipVisibility: 'ALL', hypothesisStatus: 'ALL', evidenceStance: 'ALL', layers: { files: true, officialRelationships: true, visualEdges: true, evidence: true, hypotheses: true, annotations: true } },
        pinIndexes: [], groupIndexes: []
      } }]
    },
    playerMode: { isEnabled: false, visibility: [] },
    investigation: { hypotheses: [{ id: 'hypothesis-1', title: 'Hipótese', summary: null, status: 'OPEN', createdAt: timestamp, updatedAt: timestamp, evidence: [] }] }
  };
}

describe('transferência do planejamento Q08', () => {
  it('aceita plano completo e contabiliza sessões e vínculos no dry-run', () => {
    const document = documentWithPlan();
    const validation = validateCampaignExportDocument(document);
    const dryRun = dryRunCampaignImport(document);

    expect(validation.valid).toBe(true);
    expect(validation.summary.sessions).toBe(1);
    expect(dryRun.identityPlan.sessions).toBe(1);
    expect(dryRun.identityPlan.sessionHypothesisLinks).toBe(1);
    expect(dryRun.identityPlan.sessionBoardViewLinks).toBe(1);
  });

  it('rejeita referências de hipótese e vista inexistentes sem aceitar importação parcial', () => {
    const document = documentWithPlan();
    document.sessions[0]!.hypothesisIds = ['missing-hypothesis'];
    document.sessions[0]!.viewIds = ['missing-view'];

    const validation = validateCampaignExportDocument(document);

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'reference.session.hypothesis.exists' }),
      expect.objectContaining({ rule: 'reference.session.view.exists' })
    ]));
  });

  it('rejeita item sem label e referências duplicadas', () => {
    const document = documentWithPlan();
    document.sessions[0]!.objectives = [{ id: 'objective-1', label: '', done: false }];
    document.sessions[0]!.fileIds = ['file-1', 'file-1'];

    const validation = validateCampaignExportDocument(document);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes('objectives[0].label'))).toBe(true);
  });

  it('mantém compatibilidade com documento legado sem campos Q08', () => {
    const document = documentWithPlan();
    const legacySession = document.sessions[0]!;
    delete legacySession.id;
    delete legacySession.objectives;
    delete legacySession.agenda;
    delete legacySession.postSummary;
    delete legacySession.status;
    delete legacySession.completedAt;
    delete legacySession.hypothesisIds;
    delete legacySession.viewIds;
    delete document.board.views;

    expect(validateCampaignExportDocument(document).valid).toBe(true);
  });
});
