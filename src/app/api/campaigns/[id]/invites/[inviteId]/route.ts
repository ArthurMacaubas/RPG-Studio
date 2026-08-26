import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { campaignInviteService } from '@/services/campaignInviteService';

export async function DELETE(_: Request, { params }: { params: { id: string; inviteId: string } }) {
  try {
    await campaignInviteService.revoke(params.id, params.inviteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível revogar o convite.');
  }
}
