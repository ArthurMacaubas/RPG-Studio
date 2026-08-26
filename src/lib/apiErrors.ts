import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export type PublicApiErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_REQUIRED'
  | 'ACCESS_DENIED'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_REFERENCE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'IMPORT_VALIDATION';

export class PublicApiError extends Error {
  readonly status: number;
  readonly code: PublicApiErrorCode;
  readonly publicMessage: string;

  constructor(status: number, code: PublicApiErrorCode, publicMessage: string) {
    super(publicMessage);
    this.name = 'PublicApiError';
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

interface StatusError extends Error {
  status?: number;
}

const STATUS_CONTRACT: Record<number, { code: PublicApiErrorCode; message: string }> = {
  400: { code: 'INVALID_REQUEST', message: 'A requisição é inválida.' },
  401: { code: 'AUTHENTICATION_REQUIRED', message: 'Autenticação necessária.' },
  403: { code: 'ACCESS_DENIED', message: 'Acesso não autorizado.' },
  404: { code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado.' },
  409: { code: 'CONFLICT', message: 'A operação não pode ser concluída devido a um conflito.' },
  422: { code: 'INVALID_REFERENCE', message: 'Os dados informados não são válidos.' },
  429: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde antes de tentar novamente.' }
};

function publicResponse(status: number, code: PublicApiErrorCode, message: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function apiValidationErrorResponse(message = 'A requisição é inválida.') {
  return publicResponse(400, 'INVALID_REQUEST', message);
}

function responseForStatus(status: number) {
  const contract = STATUS_CONTRACT[status] ?? STATUS_CONTRACT[500];
  return contract ? publicResponse(status in STATUS_CONTRACT ? status : 500, contract.code, contract.message) : publicResponse(500, 'INTERNAL_ERROR', 'Não foi possível concluir a operação.');
}

export function apiErrorResponse(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (error instanceof PublicApiError) return publicResponse(error.status, error.code, error.publicMessage);
  if (error instanceof SyntaxError) return publicResponse(400, 'INVALID_JSON', 'O corpo da requisição precisa conter JSON válido.');

  const typedError = error as StatusError | undefined;
  if (typedError?.status && STATUS_CONTRACT[typedError.status]) return responseForStatus(typedError.status);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return publicResponse(404, 'RESOURCE_NOT_FOUND', 'Recurso não encontrado.');
    if (error.code === 'P2002') return publicResponse(409, 'CONFLICT', 'Já existe um registro com esses dados.');
    if (error.code === 'P2003') return publicResponse(422, 'INVALID_REFERENCE', 'A referência informada não é válida.');
  }

  console.error('[API]', error);
  return publicResponse(500, 'INTERNAL_ERROR', fallback);
}
