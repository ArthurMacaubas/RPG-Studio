import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { campaignInviteService } from '@/services/campaignInviteService';

const createSchema = z.object({
  inviteeEmail: z.string().trim().email().max(320),
  expiresInDays: z.number().int().min(1).max(30).optional()
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ invites: await campaignInviteService.listForCampaign(params.id) });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar os convites.');
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
    const result = await campaignInviteService.create(params.id, parsed.data);
    return NextResponse.json({
      invite: result.invite,
      token: result.token,
      acceptUrl: `/convites/${result.token}`
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o convite.');
  }
}
