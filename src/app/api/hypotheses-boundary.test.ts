import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}));

vi.mock('@/services/hypothesisService', () => ({
  hypothesisService: {
    list: mocks.list,
    create: mocks.create,
    get: mocks.get,
    update: mocks.update,
    remove: mocks.remove
  }
}));
vi.mock('@/lib/apiErrors', () => ({
  apiValidationErrorResponse: () => new Response(JSON.stringify({ error: 'A requisição é inválida.', code: 'INVALID_REQUEST' }), { status: 400, headers: { 'content-type': 'application/json' } }),
  apiErrorResponse: (error: unknown) => new Response(JSON.stringify({ error: 'Acesso não autorizado.', code: typeof error === 'object' && error !== null && 'status' in error && Number((error as { status: unknown }).status) === 401 ? 'AUTHENTICATION_REQUIRED' : 'ACCESS_DENIED' }), { status: typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 500, headers: { 'content-type': 'application/json' } })
}));

import { GET, POST } from '@/app/api/campaigns/[id]/hypotheses/route';

const params = { params: { id: 'campaign-1' } };
const request = new NextRequest('http://localhost/api/campaigns/campaign-1/hypotheses') as never;

beforeEach(() => vi.clearAllMocks());

describe('hypotheses administrative API boundary', () => {
  it('retorna a projeção de hipóteses para OWNER', async () => {
    mocks.list.mockResolvedValue([{ id: 'hypothesis-1', campaignId: 'campaign-1', title: 'Pista', evidence: [] }]);

    const response = await GET(request, params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'hypothesis-1', campaignId: 'campaign-1', title: 'Pista', evidence: [] }]);
  });

  it('retorna 403 para PLAYER sem vazar conteúdo privado', async () => {
    mocks.list.mockRejectedValue({ status: 403, message: 'A hipótese secreta do Mestre.' });

    const response = await GET(request, params);

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('hipótese secreta');
  });

  it('retorna 401 quando não há sessão', async () => {
    mocks.list.mockRejectedValue({ status: 401, message: 'Cookie de sessão ausente.' });

    const response = await GET(request, params);

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('Cookie de sessão');
  });

  it('cria uma hipótese com payload validado', async () => {
    mocks.create.mockResolvedValue({ id: 'hypothesis-1', title: 'Nova hipótese', evidence: [] });

    const response = await POST(new NextRequest('http://localhost/api/campaigns/campaign-1/hypotheses', { method: 'POST', body: JSON.stringify({ title: 'Nova hipótese', summary: null }) }) as never, params);

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith('campaign-1', { title: 'Nova hipótese', summary: null });
  });
});
