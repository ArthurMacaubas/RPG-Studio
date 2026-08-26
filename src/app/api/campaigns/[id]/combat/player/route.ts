import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { combatService } from '@/services/combatService';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ encounter: await combatService.getPlayerView(params.id) });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar o combate para o jogador.');
  }
}
