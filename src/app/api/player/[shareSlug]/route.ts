import { apiErrorResponse } from '@/lib/apiErrors';
import { NextResponse } from 'next/server';
import { playerModeService } from '@/services/playerModeService';

export async function GET(_req: Request, { params }: { params: { shareSlug: string } }) {
  try {
    const data = await playerModeService.getPublicCampaign(params.shareSlug);
    if (!data) return NextResponse.json({ error: 'Modo Jogador não está ativo para este link' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
