import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { fileService } from '@/services/fileService';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const copy = await fileService.duplicate(params.id);
    if (!copy) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
