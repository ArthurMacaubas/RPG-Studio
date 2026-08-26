import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardAnnotationService } from '@/services/boardAnnotationService';

const coordinate = z.number().finite().min(-100000).max(100000);
const color = z.string().trim().regex(/^#[0-9a-f]{6}$/i);
const updateSchema = z.object({ text: z.string().trim().min(1).max(280).optional(), x: coordinate.optional(), y: coordinate.optional(), color: color.optional() }).strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardAnnotationService.updatePin(params.id, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o pin.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await boardAnnotationService.removePin(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover o pin.');
  }
}
