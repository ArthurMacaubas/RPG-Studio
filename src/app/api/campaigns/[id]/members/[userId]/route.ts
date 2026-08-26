import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { campaignMemberService } from '@/services/campaignMemberService';

export async function DELETE(_: Request, { params }: { params: { id: string; userId: string } }) {
  try {
    return NextResponse.json(await campaignMemberService.remove(params.id, params.userId));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover o jogador.');
  }
}
