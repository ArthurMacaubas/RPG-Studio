import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { fileService } from '@/services/fileService';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const file = await fileService.setArchived(params.id, false);
    return NextResponse.json(file);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
