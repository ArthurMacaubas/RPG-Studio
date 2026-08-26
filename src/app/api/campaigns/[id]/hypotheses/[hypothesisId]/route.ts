import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { hypothesisService } from '@/services/hypothesisService';

const statusSchema = z.enum(['OPEN', 'SUPPORTED', 'REFUTED', 'RESOLVED']);
const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(4000).nullable().optional(),
  status: statusSchema.optional()
}).refine((input) => Object.keys(input).length > 0, { message: 'Informe ao menos um campo para atualizar.' });

type Context = { params: { id: string; hypothesisId: string } };

export async function GET(_req: NextRequest, { params }: Context) {
  try {
    return NextResponse.json(await hypothesisService.get(params.id, params.hypothesisId));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar a hipótese.');
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await hypothesisService.update(params.id, params.hypothesisId, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a hipótese.');
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    await hypothesisService.remove(params.id, params.hypothesisId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover a hipótese.');
  }
}
