import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { boardService } from '@/services/boardService';

// id here is the BoardNode.id (not fileId) — used to remove a card from the
// canvas without touching the underlying file.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await boardService.removeNode(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
