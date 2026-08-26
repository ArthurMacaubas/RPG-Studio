import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardAnnotationService } from '@/services/boardAnnotationService';

const coordinate = z.number().finite().min(-100000).max(100000);
const color = z.string().trim().regex(/^#[0-9a-f]{6}$/i);
const updateSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), color: color.optional(), x: coordinate.optional(), y: coordinate.optional(), width: z.number().finite().min(80).max(5000).optional(), height: z.number().finite().min(80).max(5000).optional(), boardNodeIds: z.array(z.string().min(1)).max(500).optional() }).strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardAnnotationService.updateGroup(params.id, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o agrupamento.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await boardAnnotationService.removeGroup(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover o agrupamento.');
  }
}
