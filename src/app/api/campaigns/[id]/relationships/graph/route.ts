import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { relationshipService } from '@/services/relationshipService';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await relationshipService.getGraph(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível obter o grafo oficial da campanha.');
  }
}
