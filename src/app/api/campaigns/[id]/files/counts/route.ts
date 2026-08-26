import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { fileService } from '@/services/fileService';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const counts = await fileService.countsByType(params.id);
    const result = Object.fromEntries(counts.map((c) => [c.type, c._count._all]));
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
