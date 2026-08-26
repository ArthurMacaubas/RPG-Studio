import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { fileService } from '@/services/fileService';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    await fileService.removeAttachment(params.id, params.attachmentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
