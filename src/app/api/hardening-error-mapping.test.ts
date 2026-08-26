import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  fileGet: vi.fn(),
  fileUpdate: vi.fn(),
  fileRemove: vi.fn(),
  createAttribute: vi.fn()
}));

vi.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code = 'P2002';
    }
  }
}));
vi.mock('@/services/fileService', () => ({ fileService: { get: mocks.fileGet, update: mocks.fileUpdate, remove: mocks.fileRemove } }));
vi.mock('@/services/customSystemService', () => ({ customSystemService: { createAttribute: mocks.createAttribute, listAttributes: vi.fn() } }));

import { GET as getFile } from '@/app/api/files/[id]/route';
import { POST as createAttribute } from '@/app/api/campaigns/[id]/attributes/route';

const fileParams = { params: { id: 'file-1' } };
const campaignParams = { params: { id: 'campaign-1' } };

async function jsonResponse(response: Response) {
  return response.json() as Promise<{ error?: string; code?: string }>;
}

describe('V20.4 M1 — HTTP public error contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps service authorization errors to 403 without leaking internals', async () => {
    mocks.fileGet.mockRejectedValue(Object.assign(new Error('arquivo privado secreto'), { status: 403 }));

    const response = await getFile(new Request('http://localhost/api/files/file-1') as never, fileParams);

    expect(response.status).toBe(403);
    const body = await jsonResponse(response);
    expect(body).toEqual({ error: 'Acesso não autorizado.', code: 'ACCESS_DENIED' });
    expect(JSON.stringify(body)).not.toContain('arquivo privado secreto');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('file-1');
  });

  it('maps service conflicts to 409', async () => {
    mocks.createAttribute.mockRejectedValue(Object.assign(new Error('Já existe uma configuração com este nome nesta campanha.'), { status: 409 }));

    const response = await createAttribute(new Request('http://localhost/api/campaigns/campaign-1/attributes', { method: 'POST', body: JSON.stringify({ name: 'Sanidade' }) }) as never, campaignParams);

    expect(response.status).toBe(409);
    expect(await jsonResponse(response)).toEqual({ error: 'A operação não pode ser concluída devido a um conflito.', code: 'CONFLICT' });
  });

  it('maps JSON malformado a 400', async () => {
    const response = await createAttribute(new Request('http://localhost/api/campaigns/campaign-1/attributes', { method: 'POST', body: '{' }) as never, campaignParams);

    expect(response.status).toBe(400);
    expect(await jsonResponse(response)).toEqual({ error: 'O corpo da requisição precisa conter JSON válido.', code: 'INVALID_JSON' });
    expect(mocks.createAttribute).not.toHaveBeenCalled();
  });
});
