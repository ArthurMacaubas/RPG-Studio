import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignService } from '@/services/campaignService';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().optional(),
  isArchived: z.boolean().optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const campaign = await campaignService.get(params.id);
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a campanha.');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await campaignService.update(params.id, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar a campanha.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await campaignService.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível excluir a campanha.');
  }
}
