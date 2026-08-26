import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { favoriteFolderService } from '@/services/favoriteFolderService';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    await favoriteFolderService.removeFile(params.id, params.fileId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
