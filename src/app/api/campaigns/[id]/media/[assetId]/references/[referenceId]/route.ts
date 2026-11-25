import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { mediaService } from '@/services/mediaService';

const patchSchema = z.object({
  caption: z.string().trim().max(500).nullable().optional(),
  position: z.number().int().min(0).max(999).optional()
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: { id: string; assetId: string; referenceId: string } }) {
  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await mediaService.updateReference(params.id, params.assetId, params.referenceId, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o vínculo da mídia.');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string; assetId: string; referenceId: string } }) {
  try {
    await mediaService.detach(params.id, params.assetId, params.referenceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover o vínculo da mídia.');
  }
}
