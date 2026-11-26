import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { updateMediaSchema } from '@/lib/media';
import { mediaService } from '@/services/mediaService';

export async function PATCH(request: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  try {
    const parsed = updateMediaSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await mediaService.update(params.id, params.assetId, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a mídia.');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  try {
    await mediaService.remove(params.id, params.assetId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível excluir a mídia.');
  }
}
