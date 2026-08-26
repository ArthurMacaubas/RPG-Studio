import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { favoriteFolderService } from '@/services/favoriteFolderService';

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isCollapsed: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const folder = await favoriteFolderService.update(params.id, parsed.data);
    return NextResponse.json(folder);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await favoriteFolderService.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
