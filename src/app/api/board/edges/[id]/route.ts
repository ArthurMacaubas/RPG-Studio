import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardService } from '@/services/boardService';

const updateSchema = z.object({
  label: z.string().trim().max(80).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  curve: z.number().min(-180).max(180).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardService.updateEdge(params.id, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a conexão visual.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await boardService.removeEdge(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível excluir a conexão visual.');
  }
}
