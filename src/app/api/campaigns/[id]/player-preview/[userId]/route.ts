import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { playerModeService } from '@/services/playerModeService';

export async function GET(_request: Request, { params }: { params: { id: string; userId: string } }) {
  try {
    return NextResponse.json(await playerModeService.previewForMember(params.id, params.userId));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível montar a prévia do jogador.');
  }
}
