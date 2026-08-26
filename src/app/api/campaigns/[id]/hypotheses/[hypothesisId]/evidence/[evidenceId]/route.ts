import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { hypothesisService } from '@/services/hypothesisService';

const updateSchema = z.object({
  stance: z.enum(['SUPPORTS', 'CONTRADICTS', 'CONTEXT']).optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  order: z.number().int().nonnegative().optional()
}).refine((input) => Object.keys(input).length > 0, { message: 'Informe ao menos um campo para atualizar.' });

type Context = { params: { id: string; hypothesisId: string; evidenceId: string } };

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await hypothesisService.updateEvidence(params.id, params.hypothesisId, params.evidenceId, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a evidência.');
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    await hypothesisService.removeEvidence(params.id, params.hypothesisId, params.evidenceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover a evidência.');
  }
}
