import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { hypothesisService } from '@/services/hypothesisService';

const createSchema = z.object({
  fileId: z.string().trim().min(1),
  stance: z.enum(['SUPPORTS', 'CONTRADICTS', 'CONTEXT']),
  note: z.string().trim().max(1000).nullable().optional(),
  order: z.number().int().nonnegative().optional()
});

type Context = { params: { id: string; hypothesisId: string } };

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await hypothesisService.addEvidence(params.id, params.hypothesisId, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível adicionar a evidência.');
  }
}
