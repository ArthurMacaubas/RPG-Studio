import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  exportCampaign: vi.fn()
}));

vi.mock('@/services/campaignTransferService', () => ({ exportCampaign: state.exportCampaign }));

import { GET } from './route';

function request(format = 'json') {
  return { nextUrl: new URL(`http://localhost/api/campaigns/campaign-1/export?format=${format}`) } as never;
}

async function body(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('rota de exportação administrativa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o documento quando o serviço autoriza o OWNER', async () => {
    state.exportCampaign.mockResolvedValue({ campaign: { name: 'Campanha segura' } });

    const response = await GET(request(), { params: { id: 'campaign-1' } });

    expect(response.status).toBe(200);
    expect(state.exportCampaign).toHaveBeenCalledWith('campaign-1');
    expect(await response.json()).toEqual({ campaign: { name: 'Campanha segura' } });
  });

  it('retorna 403 público para PLAYER e não entrega documento', async () => {
    state.exportCampaign.mockRejectedValue(Object.assign(new Error('PLAYER não deve ver este documento'), { status: 403 }));

    const response = await GET(request(), { params: { id: 'campaign-1' } });

    expect(response.status).toBe(403);
    expect(await body(response)).toEqual({ error: 'Acesso não autorizado.', code: 'ACCESS_DENIED' });
    expect(response.headers.get('Content-Disposition')).toBeNull();
  });

  it('retorna 401 público para sessão ausente e não entrega documento', async () => {
    state.exportCampaign.mockRejectedValue(Object.assign(new Error('sessão interna ausente'), { status: 401 }));

    const response = await GET(request(), { params: { id: 'campaign-1' } });

    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ error: 'Autenticação necessária.', code: 'AUTHENTICATION_REQUIRED' });
    expect(response.headers.get('Content-Disposition')).toBeNull();
  });
});
