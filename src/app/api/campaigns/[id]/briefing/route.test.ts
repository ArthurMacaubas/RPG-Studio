import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAdmin: vi.fn(),
  save: vi.fn(),
  setPublished: vi.fn()
}));

vi.mock('@/services/campaignBriefingService', () => ({ campaignBriefingService: mocks }));
vi.mock('@/lib/apiErrors', () => ({
  apiErrorResponse: (error: unknown, fallback: string) => new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 500 }),
  apiValidationErrorResponse: () => new Response(JSON.stringify({ error: 'Dados inválidos.' }), { status: 422 })
}));

import { GET, POST, PUT } from './route';

const params = { params: { id: 'campaign-1' } };

beforeEach(() => vi.clearAllMocks());

describe('briefing API route', () => {
  it('retorna o briefing administrativo somente pelo serviço OWNER', async () => {
    mocks.getAdmin.mockResolvedValue({ id: 'briefing-1', campaignId: 'campaign-1', title: 'Título', body: 'Corpo', isPublished: false });

    const response = await GET(new Request('http://localhost/api/campaigns/campaign-1/briefing') as never, params);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ briefing: { isPublished: false } });
    expect(mocks.getAdmin).toHaveBeenCalledWith('campaign-1');
  });

  it('rejeita body inválido sem repassar detalhes do Zod', async () => {
    const response = await PUT(new Request('http://localhost/api/campaigns/campaign-1/briefing', { method: 'PUT', body: JSON.stringify({ title: '', body: '' }) }) as never, params);

    expect(response.status).toBe(422);
    expect(await response.text()).not.toContain('Zod');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('salva e publica somente através das ações explícitas', async () => {
    mocks.save.mockResolvedValue({ id: 'briefing-1', title: 'Título', body: 'Corpo', isPublished: false });
    mocks.setPublished.mockResolvedValue({ id: 'briefing-1', title: 'Título', body: 'Corpo', isPublished: true });

    const saveResponse = await PUT(new Request('http://localhost/api/campaigns/campaign-1/briefing', { method: 'PUT', body: JSON.stringify({ title: 'Título', body: 'Corpo' }) }) as never, params);
    const publishResponse = await POST(new Request('http://localhost/api/campaigns/campaign-1/briefing', { method: 'POST', body: JSON.stringify({ isPublished: true }) }) as never, params);

    expect(saveResponse.status).toBe(200);
    expect(publishResponse.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith('campaign-1', { title: 'Título', body: 'Corpo' });
    expect(mocks.setPublished).toHaveBeenCalledWith('campaign-1', true);
  });
});
