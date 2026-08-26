import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { combatService } from '@/services/combatService';

export async function GET(_request: Request, { params }: { params: { id: string; encounterId: string } }) {
  try {
    return NextResponse.json(await combatService.get(params.id, params.encounterId));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar o encontro.');
  }
}
