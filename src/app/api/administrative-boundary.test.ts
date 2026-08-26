import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  computeCampaignHealth: vi.fn(),
  timelineList: vi.fn(),
  timelineCreate: vi.fn(),
  timelineUpdate: vi.fn(),
  timelineRemove: vi.fn()
}));

vi.mock('@/services/campaignHealthService', () => ({ computeCampaignHealth: mocks.computeCampaignHealth }));
vi.mock('@/services/timelineService', () => ({ timelineService: { list: mocks.timelineList, create: mocks.timelineCreate, update: mocks.timelineUpdate, remove: mocks.timelineRemove } }));
vi.mock('@/lib/apiErrors', () => ({
  apiErrorResponse: (error: unknown) => new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 500, headers: { 'content-type': 'application/json' } })
}));

import { GET as getHealth } from '@/app/api/campaigns/[id]/health/route';
import { POST as simulateHealth } from '@/app/api/campaigns/[id]/health/simulate/route';
import { GET as getTimeline } from '@/app/api/campaigns/[id]/timeline/route';
import { PATCH as patchTimeline, DELETE as deleteTimeline } from '@/app/api/timeline/[id]/route';

const params = { params: { id: 'campaign-1' } };
const eventParams = { params: { id: 'event-1' } };
const request = new Request('http://localhost/api/test') as never;

describe('V20.2 administrative API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite health administrativo para OWNER sem reduzir o diagnóstico', async () => {
    mocks.computeCampaignHealth.mockResolvedValue({ score: 100, errors: [], warnings: [], suggestions: [], simulation: { paths: [] } });
    const response = await getHealth(request, params);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ score: 100 });
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('nega GET /health chamado diretamente por PLAYER %s sem expor conteúdo privado', async () => {
    mocks.computeCampaignHealth.mockRejectedValue({ status: 403, message: 'O puzzle privado existe.' });
    const response = await getHealth(request, params);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('puzzle privado');
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('nega POST /health/simulate chamado diretamente por PLAYER %s', async () => {
    mocks.computeCampaignHealth.mockRejectedValue({ status: 403, message: 'Nó secreto.' });
    const response = await simulateHealth(request, params);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('Nó secreto');
  });

  it('nega health sem sessão com 401', async () => {
    mocks.computeCampaignHealth.mockRejectedValue({ status: 401, message: 'Autenticação obrigatória.' });
    const response = await getHealth(request, params);
    expect(response.status).toBe(401);
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('nega timeline administrativa chamada diretamente por PLAYER %s', async () => {
    mocks.timelineList.mockRejectedValue({ status: 403, message: 'Evento de arquivo privado.' });
    const response = await getTimeline(request, params);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('arquivo privado');
  });

  it('nega timeline administrativa sem sessão', async () => {
    mocks.timelineList.mockRejectedValue({ status: 401, message: 'Autenticação obrigatória.' });
    const response = await getTimeline(request, params);
    expect(response.status).toBe(401);
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('nega PATCH de timeline chamado diretamente por PLAYER %s', async () => {
    mocks.timelineUpdate.mockRejectedValue({ status: 403, message: 'Referência particular.' });
    const response = await patchTimeline(new Request('http://localhost/api/timeline/event-1', { method: 'PATCH', body: JSON.stringify({ title: 'Tentativa' }) }) as never, eventParams);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('Referência particular');
  });

  it.each(['P1', 'P2', 'P3', 'P4'])('nega DELETE de timeline chamado diretamente por PLAYER %s', async () => {
    mocks.timelineRemove.mockRejectedValue({ status: 403, message: 'Referência particular.' });
    const response = await deleteTimeline(request, eventParams);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('Referência particular');
  });

  it('retorna ao OWNER apenas a projeção explícita de timeline', async () => {
    mocks.timelineList.mockResolvedValue([{ id: 'event-1', campaignId: 'campaign-1', title: 'Evento público', happenedAt: new Date('2026-01-01T00:00:00.000Z'), order: 0, fileId: 'file-1', file: { id: 'file-1', name: 'Pista', type: 'CLUE', isArchived: false, isTrashed: false } }]);
    const response = await getTimeline(request, params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0].file).toEqual({ id: 'file-1', name: 'Pista', type: 'CLUE', isArchived: false, isTrashed: false });
    expect(body[0].file).not.toHaveProperty('data');
  });
});
