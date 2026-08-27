import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertCampaignRole: vi.fn(),
  publishedFileWhere: vi.fn(),
  recordAudit: vi.fn(),
  briefingFindUnique: vi.fn(),
  briefingFindFirst: vi.fn(),
  briefingUpsert: vi.fn(),
  briefingUpdate: vi.fn(),
  timelineFindMany: vi.fn()
}));

vi.mock('@/lib/access', () => ({ assertCampaignRole: mocks.assertCampaignRole, AccessDeniedError: class AccessDeniedError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } } }));
vi.mock('@/lib/publicationPolicy', () => ({ publishedFileWhere: mocks.publishedFileWhere }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaignBriefing: { findUnique: mocks.briefingFindUnique, findFirst: mocks.briefingFindFirst, upsert: mocks.briefingUpsert, update: mocks.briefingUpdate },
    timelineEvent: { findMany: mocks.timelineFindMany }
  }
}));
vi.mock('@/services/auditService', () => ({ recordAudit: mocks.recordAudit }));

import { campaignBriefingService, MAX_PUBLIC_TIMELINE_EVENTS } from './campaignBriefingService';

const ownerAccess = { role: 'OWNER', user: { id: 'owner-1' } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.assertCampaignRole.mockResolvedValue(ownerAccess);
  mocks.recordAudit.mockResolvedValue(undefined);
  mocks.publishedFileWhere.mockReturnValue({ campaignId: 'campaign-1', isArchived: false, isTrashed: false, playerVisibility: { isVisible: true } });
});

describe('campaignBriefingService', () => {
  it('salva briefing como rascunho e audita a alteração sem conteúdo privado', async () => {
    mocks.briefingUpsert.mockResolvedValue({ id: 'briefing-1', campaignId: 'campaign-1', title: 'Próxima sessão', body: 'Mensagem', isPublished: false, createdAt: new Date(), updatedAt: new Date() });

    const result = await campaignBriefingService.save('campaign-1', { title: 'Próxima sessão', body: 'Mensagem' });

    expect(result.isPublished).toBe(false);
    expect(mocks.briefingUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { campaignId: 'campaign-1' },
      create: { campaignId: 'campaign-1', title: 'Próxima sessão', body: 'Mensagem' },
      update: { title: 'Próxima sessão', body: 'Mensagem' }
    }));
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'BRIEFING_SAVED', metadata: { isPublished: false } }));
  });

  it('exige briefing existente para publicar ou retirar', async () => {
    mocks.briefingFindUnique.mockResolvedValue(null);

    await expect(campaignBriefingService.setPublished('campaign-1', true)).rejects.toMatchObject({ status: 404 });
    expect(mocks.briefingUpdate).not.toHaveBeenCalled();
  });

  it('projeta somente briefing e timeline publicados visíveis ao viewer', async () => {
    const viewer = { kind: 'PLAYER' as const, campaignId: 'campaign-1', userId: 'player-1', audience: 'P2' as const };
    mocks.briefingFindFirst.mockResolvedValue({ title: 'Contexto', body: 'Mensagem pública' });
    mocks.timelineFindMany.mockResolvedValue([
      { title: 'Marco visível', happenedAt: new Date('2026-08-26T12:00:00.000Z'), file: { name: 'Pista pública', type: 'CLUE' } },
      { title: 'Marco sem arquivo', happenedAt: new Date('2026-08-27T12:00:00.000Z'), file: null }
    ]);

    const result = await campaignBriefingService.getPublicSnapshot(viewer);

    expect(mocks.publishedFileWhere).toHaveBeenCalledWith(viewer);
    expect(mocks.briefingFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: 'campaign-1', isPublished: true } }));
    expect(mocks.timelineFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ campaignId: 'campaign-1', isPublished: true, OR: [{ fileId: null }, { file: { is: expect.any(Object) } }] }),
      take: MAX_PUBLIC_TIMELINE_EVENTS
    }));
    const select = mocks.timelineFindMany.mock.calls[0]?.[0]?.select as Record<string, unknown>;
    expect(select).not.toHaveProperty('id');
    expect(select).not.toHaveProperty('campaignId');
    expect(select).not.toHaveProperty('fileId');
    expect(result).toEqual({
      briefing: { title: 'Contexto', body: 'Mensagem pública' },
      timeline: [
        { title: 'Marco visível', happenedAt: '2026-08-26T12:00:00.000Z', file: { name: 'Pista pública', type: 'CLUE' } },
        { title: 'Marco sem arquivo', happenedAt: '2026-08-27T12:00:00.000Z', file: null }
      ]
    });
  });

  it('mantém a coleção vazia quando não existe publicação', async () => {
    mocks.briefingFindFirst.mockResolvedValue(null);
    mocks.timelineFindMany.mockResolvedValue([]);

    await expect(campaignBriefingService.getPublicSnapshot({ kind: 'PUBLIC', campaignId: 'campaign-1' })).resolves.toEqual({ briefing: null, timeline: [] });
  });
});
