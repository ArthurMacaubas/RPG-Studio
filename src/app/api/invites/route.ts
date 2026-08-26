import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { campaignInviteService } from '@/services/campaignInviteService';

export async function GET() {
  try {
    return NextResponse.json({ invites: await campaignInviteService.listForCurrentUser() });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar seus convites.');
  }
}
