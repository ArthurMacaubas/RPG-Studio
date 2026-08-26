import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardViewService } from '@/services/boardViewService';

const kindSchema = z.enum(['SESSION', 'CASE', 'ARC']);
const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: kindSchema.optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  order: z.number().int().min(0).max(100000).optional(),
  snapshot: z.unknown().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardViewService.update(params.id, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a vista salva.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await boardViewService.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover a vista salva.');
  }
}
