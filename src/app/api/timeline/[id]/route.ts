import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { timelineService } from '@/services/timelineService';

const schema = z.object({
  title: z.string().min(1).max(160).optional(),
  happenedAt: z.string().datetime({ offset: true }).optional(),
  fileId: z.string().nullable().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const event = await timelineService.update(params.id, {
      ...parsed.data,
      happenedAt: parsed.data.happenedAt ? new Date(parsed.data.happenedAt) : undefined
    });
    return NextResponse.json(event);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o evento da timeline.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await timelineService.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível excluir o evento da timeline.');
  }
}
