import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/access', () => ({ assertCampaignAccess: vi.fn(), assertCampaignRole: vi.fn().mockResolvedValue({ role: 'OWNER' }) }));

import { CampaignTransferError, dryRunCampaignImport, importCampaign, validateCampaignExportDocument } from './campaignTransferService';
import type { CampaignExportDocument } from '@/types';

function sampleDocument(): CampaignExportDocument {
  return {
    format: 'rpg-campaign-studio',
    version: 1,
    exportedAt: '2026-08-19T12:00:00.000Z',
    campaign: {
      id: 'campaign-1',
      name: 'Campanha de teste',
      description: null,
      system: 'CUSTOM',
      coverImage: null
    },
    customSystem: { attributes: [], skills: [], classes: [], races: [] },
    files: [
      {
        id: 'file-1',
        type: 'NPC',
        name: 'NPC de teste',
        description: null,
        content: null,
        authorId: 'author-1',
        data: {},
        isFavorite: false,
        isArchived: false,
        isTrashed: false,
        trashedAt: null,
        createdAt: '2026-08-19T12:00:00.000Z',
        updatedAt: '2026-08-19T12:00:00.000Z',
        tags: ['tag-1'],
        attachments: [],
        comments: [],
        history: []
      }
    ],
    tags: [{ id: 'tag-1', name: 'Pista', color: '#7B5CFF', icon: null, description: null }],
    relationships: [],
    favoriteFolders: [],
    sessions: [],
    timelineEvents: [],
    board: { nodes: [], edges: [] },
    playerMode: { isEnabled: false, visibility: [] }
  };
}

function documentWithRelationship(typeKey?: string, kind: CampaignExportDocument['relationships'][number]['kind'] = 'GENERIC') {
  const document = sampleDocument();
  const firstFile = document.files[0]!;
  document.files.push({ ...firstFile, id: 'file-2', name: 'Destino da relação', tags: [] });
  document.relationships.push({ fromId: 'file-1', toId: 'file-2', kind, typeKey, label: null, createdAt: document.exportedAt });
  return document;
}

describe('validateCampaignExportDocument', () => {
  it('accepts a complete document and returns its counts', () => {
    const result = validateCampaignExportDocument(sampleDocument());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.summary).toMatchObject({ files: 1, tags: 1 });
  });

  it('rejects a relationship that points to a missing file', () => {
    const document = sampleDocument();
    document.relationships.push({ fromId: 'file-1', toId: 'missing', kind: 'LEADS_TO', label: null, createdAt: document.exportedAt });
    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('arquivo inexistente'))).toBe(true);
  });

  it('rejects duplicate file IDs and missing tags', () => {
    const document = sampleDocument();
    const firstFile = document.files[0]!;
    document.files.push({ ...firstFile, name: 'Duplicado' });
    firstFile.tags = ['missing-tag'];
    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('aparece mais de uma vez'))).toBe(true);
    expect(result.errors.some((error) => error.includes('tag inexistente'))).toBe(true);
  });

  it('aceita ID, tipo, descrição, importância e visibilidade individual de relacionamento', () => {
    const document = sampleDocument();
    const firstFile = document.files[0]!;
    document.files.push({ ...firstFile, id: 'file-2', name: 'Alvo da relação', tags: [] });
    document.relationshipTypes = [{ id: 'type-reveals', scope: 'CAMPAIGN', key: 'REVEALS', name: 'Revela', description: 'Conexão investigativa', directional: true, color: '#c8a66a', icon: 'sparkles' }];
    document.relationships.push({ id: 'relationship-1', fromId: 'file-1', toId: 'file-2', kind: 'GENERIC', typeKey: 'REVEALS', label: 'Pista principal', description: 'A pista identifica o alvo.', importance: 'CRITICAL', visibility: 'P1', createdAt: document.exportedAt, updatedAt: document.exportedAt });

    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(true);
    expect(result.summary.relationships).toBe(1);
  });

  it('rejeita duas relações com a mesma origem, destino e tipo antes de atingir a constraint do banco', () => {
    const document = sampleDocument();
    const firstFile = document.files[0]!;
    document.files.push({ ...firstFile, id: 'file-2', name: 'Alvo da relação', tags: [] });
    document.relationships.push({ id: 'relationship-1', fromId: 'file-1', toId: 'file-2', kind: 'LEADS_TO', typeKey: 'REVEALS', label: null, createdAt: document.exportedAt });
    document.relationships.push({ id: 'relationship-2', fromId: 'file-1', toId: 'file-2', kind: 'LEADS_TO', typeKey: 'REVEALS', label: null, createdAt: document.exportedAt });

    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('duplica origem, destino e tipo'))).toBe(true);
  });

  it('aceita relacionamento com typeKey global válido', () => {
    const document = documentWithRelationship('REVEALS');

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(true);
  });

  it('rejeita typeKey inexistente com índice, chave e motivo explícitos', () => {
    const document = documentWithRelationship('REVEALS_UNKNOWN');

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('relationships[0].typeKey "REVEALS_UNKNOWN" é inválido: tipo não encontrado em relationshipTypes nem entre os tipos globais suportados.');
  });

  it('aceita relationshipType personalizado declarado no próprio JSON', () => {
    const document = documentWithRelationship('INVESTIGA');
    document.relationshipTypes = [{ key: 'INVESTIGA', name: 'Investiga', scope: 'CAMPAIGN', directional: true, description: null, color: null, icon: null }];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(true);
  });

  it('aceita relationshipType global declarado quando pertence ao vocabulário suportado', () => {
    const document = documentWithRelationship('KNOWS');
    document.relationshipTypes = [{ key: 'KNOWS', name: 'Conhece', scope: 'GLOBAL', directional: true, description: null, color: null, icon: null }];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(true);
  });

  it('rejeita relationshipTypes com chaves duplicadas', () => {
    const document = documentWithRelationship('INVESTIGA');
    document.relationshipTypes = [
      { key: 'INVESTIGA', name: 'Investiga', scope: 'CAMPAIGN', directional: true, description: null, color: null, icon: null },
      { key: 'investiga', name: 'Investiga novamente', scope: 'CAMPAIGN', directional: true, description: null, color: null, icon: null }
    ];

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('chave duplicada "INVESTIGA"'))).toBe(true);
  });

  it('rejeita curve de BoardEdge fora do intervalo visual permitido', () => {
    const document = sampleDocument();
    document.files.push({ ...document.files[0]!, id: 'file-2', name: 'Destino', tags: [] });
    document.board = {
      nodes: [{ fileId: 'file-1', x: 0, y: 0 }, { fileId: 'file-2', x: 100, y: 100 }],
      edges: [{ fromFileId: 'file-1', toFileId: 'file-2', label: null, color: '#c8a66a', description: null, curve: 181 }]
    };

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ path: 'board.edges[0].curve', rule: 'range.boardEdge.curve' }));
  });

  it('aceita um relacionamento legado sem typeKey quando kind é suportado', async () => {
    const document = documentWithRelationship(undefined, 'LEADS_TO');

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(true);
  });

  it('rejeita relationshipType referenciado e não declarado antes de abrir transação de importação', async () => {
    const document = documentWithRelationship('VINCULO_NAO_DECLARADO');

    await expect(importCampaign('owner-1', document)).rejects.toBeInstanceOf(CampaignTransferError);
  });
});


import { remapCustomSystemData } from './campaignTransferService';

describe('remapCustomSystemData', () => {
  it('remaps custom system IDs in scalar fields and keyed maps', () => {
    const result = remapCustomSystemData(
      {
        classId: 'old-class',
        raceId: 'old-race',
        attributes: { 'old-attr': 15 },
        skills: { 'old-skill': true },
        nested: { attributeId: 'old-attr', skillId: 'old-skill' }
      },
      {
        attributeIds: new Map([['old-attr', 'new-attr']]),
        skillIds: new Map([['old-skill', 'new-skill']]),
        classIds: new Map([['old-class', 'new-class']]),
        raceIds: new Map([['old-race', 'new-race']])
      }
    );

    expect(result).toEqual({
      classId: 'new-class',
      raceId: 'new-race',
      attributes: { 'new-attr': 15 },
      skills: { 'new-skill': true },
      nested: { attributeId: 'new-attr', skillId: 'new-skill' }
    });
  });
});


describe('custom system validation', () => {
  it('rejects a skill linked to an unknown attribute', () => {
    const document = sampleDocument();
    document.customSystem.attributes = [];
    document.customSystem.skills = [{
      id: 'skill-1',
      name: 'Percepção',
      linkedAttr: 'missing-attribute',
      order: 0
    }];

    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('linkedAttr'))).toBe(true);
  });
});

describe('V20.1 integrity validation', () => {
  it.each([
    ['arquivo', (document: CampaignExportDocument) => { document.files[0]!.createdAt = 'ontem'; }, 'files[0].createdAt'],
    ['anexo', (document: CampaignExportDocument) => { document.files[0]!.attachments = [{ url: 'https://example.com/a.png', label: null, mimeType: null, createdAt: 'invalid' }]; }, 'files[0].attachments[0].createdAt'],
    ['comentário', (document: CampaignExportDocument) => { document.files[0]!.comments = [{ authorId: null, body: 'Olá', createdAt: 'invalid' }]; }, 'files[0].comments[0].createdAt'],
    ['histórico', (document: CampaignExportDocument) => { document.files[0]!.history = [{ authorId: null, action: 'edited', summary: null, createdAt: 'invalid' }]; }, 'files[0].history[0].createdAt'],
    ['relação', (document: CampaignExportDocument) => { const first = document.files[0]!; document.files.push({ ...first, id: 'file-2', tags: [] }); document.relationships = [{ fromId: 'file-1', toId: 'file-2', kind: 'LEADS_TO', label: null, createdAt: 'invalid' }]; }, 'relationships[0].createdAt'],
    ['sessão', (document: CampaignExportDocument) => { document.sessions = [{ name: 'Sessão 1', date: 'invalid', summary: null, checklist: [], order: 0, fileIds: [] }]; }, 'sessions[0].date'],
    ['timeline', (document: CampaignExportDocument) => { document.timelineEvents = [{ title: 'Acontecimento', happenedAt: 'invalid', order: 0, fileId: null }]; }, 'timelineEvents[0].happenedAt']
  ])('rejeita data inválida em %s com caminho, valor e regra', (_label, mutate, path) => {
    const document = sampleDocument();
    mutate(document);
    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ path, rule: 'date.iso_utc_milliseconds' }));
  });

  it('rejeita referências de arquivo, visibilidade e sistema personalizado inexistentes com caminho localizável', () => {
    const document = sampleDocument();
    document.campaign.system = 'CUSTOM';
    document.files[0]!.data = { classId: 'class-inexistente', attributes: { 'attr-inexistente': 10 } };
    document.playerMode.visibility = [{ fileId: 'file-inexistente', isVisible: true }];
    const result = validateCampaignExportDocument(document);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'files[0].data.classId', rule: 'reference.customSystem.classes' }),
      expect.objectContaining({ path: 'files[0].data.attributes.attr-inexistente', rule: 'reference.customSystem.attributes' }),
      expect.objectContaining({ path: 'playerMode.visibility[0].fileId', rule: 'reference.file.exists' })
    ]));
  });

  it('produz dry run sem criar campanha e explica a estratégia de remapeamento', () => {
    const result = dryRunCampaignImport(sampleDocument(), { identityMode: 'PRESERVE_WHEN_AVAILABLE' });
    expect(result).toMatchObject({
      canImport: true,
      identityMode: 'PRESERVE_WHEN_AVAILABLE',
      identityPlan: { strategy: 'PRESERVE_WHEN_AVAILABLE', files: 1, tags: 1, relationships: 0 }
    });
  });

  it('aceita hipóteses com evidências de fichas da mesma exportação e conta o dry run', () => {
    const document = sampleDocument();
    document.investigation = {
      hypotheses: [{
        id: 'hypothesis-1',
        title: 'O zelador esconde a chave',
        summary: 'Linha de investigação sintética.',
        status: 'OPEN',
        createdAt: document.exportedAt,
        updatedAt: document.exportedAt,
        evidence: [{ id: 'evidence-1', fileId: 'file-1', stance: 'SUPPORTS', note: 'A ficha menciona o armário.', order: 0, createdAt: document.exportedAt, updatedAt: document.exportedAt }]
      }]
    };

    const result = validateCampaignExportDocument(document);
    const dryRun = dryRunCampaignImport(document);

    expect(result.valid).toBe(true);
    expect(dryRun.identityPlan).toMatchObject({ hypotheses: 1, hypothesisEvidence: 1 });
  });

  it('rejeita hipótese com estado inválido, evidência duplicada e arquivo inexistente', () => {
    const document = sampleDocument();
    document.investigation = {
      hypotheses: [{
        title: 'Hipótese inválida',
        summary: null,
        status: 'UNKNOWN' as never,
        createdAt: document.exportedAt,
        updatedAt: document.exportedAt,
        evidence: [
          { fileId: 'missing-file', stance: 'SUPPORTS', note: null, order: 0, createdAt: document.exportedAt },
          { fileId: 'missing-file', stance: 'SUPPORTS', note: null, order: 1, createdAt: document.exportedAt }
        ]
      }]
    };

    const result = validateCampaignExportDocument(document);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'enum.investigation.hypothesis.status' }),
      expect.objectContaining({ rule: 'reference.file.exists' }),
      expect.objectContaining({ rule: 'unique.investigation.evidence.fileId' })
    ]));
  });
});
