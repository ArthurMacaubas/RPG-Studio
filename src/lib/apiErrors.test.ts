import { vi, describe, it, expect } from 'vitest';

vi.mock('@prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, options: { code: string }) {
        super(message);
        this.name = 'PrismaClientKnownRequestError';
        this.code = options.code;
      }
    }
  }
}));

import { Prisma } from '@prisma/client';
import { apiErrorResponse, PublicApiError } from './apiErrors';

async function bodyOf(response: Response) {
  return response.json() as Promise<{ error: string; code: string }>;
}

describe('apiErrorResponse', () => {
  it('never echoes a private message attached to a status error', async () => {
    const response = apiErrorResponse(Object.assign(new Error('arquivo privado secreto'), { status: 403 }));

    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ error: 'Acesso não autorizado.', code: 'ACCESS_DENIED' });
  });

  it('allows only an explicitly classified public error to define its message', async () => {
    const response = apiErrorResponse(new PublicApiError(409, 'CONFLICT', 'Este conflito pode ser mostrado ao usuário.'));

    expect(response.status).toBe(409);
    expect(await bodyOf(response)).toEqual({ error: 'Este conflito pode ser mostrado ao usuário.', code: 'CONFLICT' });
  });

  it('maps malformed JSON to a stable 400 contract', async () => {
    const response = apiErrorResponse(new SyntaxError('Unexpected token } in JSON'));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'O corpo da requisição precisa conter JSON válido.', code: 'INVALID_JSON' });
  });

  it.each([
    ['P2025', 404, 'RESOURCE_NOT_FOUND', 'Recurso não encontrado.'],
    ['P2002', 409, 'CONFLICT', 'Já existe um registro com esses dados.'],
    ['P2003', 422, 'INVALID_REFERENCE', 'A referência informada não é válida.']
  ] as const)('maps Prisma %s to a stable public response', async (prismaCode, status, code, errorMessage) => {
    const error = new Prisma.PrismaClientKnownRequestError('internal prisma detail', { code: prismaCode, clientVersion: 'test-client-5.22.0' });
    const response = apiErrorResponse(error);

    expect(response.status).toBe(status);
    expect(await bodyOf(response)).toEqual({ error: errorMessage, code });
  });

  it('uses a safe fallback for unexpected errors and keeps details server-side', async () => {
    const response = apiErrorResponse(new Error('stack e identificador privado'), 'Não foi possível concluir a operação.');

    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({ error: 'Não foi possível concluir a operação.', code: 'INTERNAL_ERROR' });
  });
});
