import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getGraph: vi.fn() }));

vi.mock('@/services/relationshipService', () => ({ relationshipService: { getGraph: mocks.getGraph } }));

import { GET } from './campaigns/[id]/relationships/graph/route';

describe('relationships graph boundary Q03', () => {
  beforeEach(() => vi.clearAllMocks());

  it('encaminha somente IDs únicos e formatados para o serviço', async () => {
    mocks.getGraph.mockResolvedValue({ nodes: [], edges: [] });
    const request = new NextRequest('http://localhost/api/campaigns/campaign-1/relationships/graph?fileIds=file-a,file-b');

    const response = await GET(request, { params: { id: 'campaign-1' } });

    expect(response.status).toBe(200);
    expect(mocks.getGraph).toHaveBeenCalledWith('campaign-1', ['file-a', 'file-b']);
  });

  it('recusa parâmetro inválido sem consultar relações', async () => {
    const request = new NextRequest('http://localhost/api/campaigns/campaign-1/relationships/graph?fileIds=file-a,../private');

    const response = await GET(request, { params: { id: 'campaign-1' } });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(mocks.getGraph).not.toHaveBeenCalled();
  });

  it('mantém chamada sem filtro compatível com o grafo completo', async () => {
    mocks.getGraph.mockResolvedValue({ nodes: [], edges: [] });
    const request = new NextRequest('http://localhost/api/campaigns/campaign-1/relationships/graph');

    const response = await GET(request, { params: { id: 'campaign-1' } });

    expect(response.status).toBe(200);
    expect(mocks.getGraph).toHaveBeenCalledWith('campaign-1', undefined);
  });
});
