import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { campaignInviteService } from '@/services/campaignInviteService';

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    return NextResponse.json({ invite: await campaignInviteService.preview(params.token) });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar este convite.');
  }
}
