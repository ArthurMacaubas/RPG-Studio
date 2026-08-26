import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignMemberService } from '@/services/campaignMemberService';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ members: await campaignMemberService.listForCampaign(params.id) });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar os jogadores.');
  }
}

const audienceSchema = z.object({ userId: z.string().min(1), audience: z.enum(['P1', 'P2', 'P3', 'P4']).nullable() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = audienceSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await campaignMemberService.setAudience(params.id, parsed.data.userId, parsed.data.audience));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a audiência do jogador.');
  }
}
