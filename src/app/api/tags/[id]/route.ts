import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tagService } from '@/services/tagService';

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().max(300).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const tag = await tagService.update(params.id, parsed.data);
    return NextResponse.json(tag);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await tagService.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
