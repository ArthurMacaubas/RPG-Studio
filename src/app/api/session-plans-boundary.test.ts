import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  getById: vi.fn(),
  updateFromId: vi.fn(),
  removeFromId: vi.fn()
}));

vi.mock('@/services/sessionPlanningService', () => ({ sessionPlanningService: mocks }));
vi.mock('@/lib/apiErrors', () => ({
  apiValidationErrorResponse: () => new Response(JSON.stringify({ error: 'Dados inválidos.' }), { status: 400, headers: { 'content-type': 'application/json' } }),
  apiErrorResponse: (error: unknown) => new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), { status: typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) : 500, headers: { 'content-type': 'application/json' } })
}));

import { GET as listPlans, POST as createPlan } from '@/app/api/campaigns/[id]/session-plans/route';
import { GET as getPlan, PATCH as patchPlan, DELETE as deletePlan } from '@/app/api/session-plans/[id]/route';

const campaignParams = { params: { id: 'campaign-1' } };
const planParams = { params: { id: 'session-1' } };
const request = new Request('http://localhost/api/session-plans/session-1') as never;

beforeEach(() => vi.clearAllMocks());

describe('Q08 session planning HTTP boundary', () => {
  it('retorna apenas dados do serviço OWNER no listing', async () => {
    mocks.list.mockResolvedValue([{ id: 'session-1', campaignId: 'campaign-1', name: 'Planejamento', status: 'PLANNED' }]);

    const response = await listPlans(request, campaignParams);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'session-1', campaignId: 'campaign-1', name: 'Planejamento', status: 'PLANNED' }]);
    expect(mocks.list).toHaveBeenCalledWith('campaign-1');
  });

  it('rejeita payload de criação inválido antes do serviço', async () => {
    const response = await createPlan(new Request('http://localhost/api/campaigns/campaign-1/session-plans', { method: 'POST', body: JSON.stringify({ name: '' }) }) as never, campaignParams);

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('não publica mensagem privada quando o GET por ID falha por autenticação', async () => {
    mocks.getById.mockRejectedValue({ status: 401, message: 'Conta privada do Mestre.' });

    const response = await getPlan(request, planParams);

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('Conta privada');
  });

  it('atualiza por ID somente após validação do payload', async () => {
    mocks.updateFromId.mockResolvedValue({ id: 'session-1', status: 'COMPLETED' });

    const response = await patchPlan(new Request('http://localhost/api/session-plans/session-1', { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED', objectives: [] }) }) as never, planParams);

    expect(response.status).toBe(200);
    expect(mocks.updateFromId).toHaveBeenCalledWith('session-1', { status: 'COMPLETED', objectives: [] });
  });

  it('remove por ID retorna 204 e não devolve conteúdo administrativo', async () => {
    mocks.removeFromId.mockResolvedValue(undefined);

    const response = await deletePlan(request, planParams);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(mocks.removeFromId).toHaveBeenCalledWith('session-1');
  });
});
