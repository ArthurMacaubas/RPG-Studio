import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { playerModeService } from '@/services/playerModeService';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await playerModeService.getAuthenticatedCampaign(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a área de jogador.');
  }
}
