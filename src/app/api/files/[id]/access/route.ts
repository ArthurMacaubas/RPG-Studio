import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { fileAccessService } from '@/services/fileAccessService';

const schema = z.object({
  restrictToGrants: z.boolean(),
  grants: z.array(z.object({ userId: z.string().min(1), canView: z.boolean() })).max(100)
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await fileAccessService.get(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar as permissões do arquivo.');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiValidationErrorResponse();
  try {
    return NextResponse.json(await fileAccessService.update(params.id, parsed.data.restrictToGrants, parsed.data.grants));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar as permissões do arquivo.');
  }
}
