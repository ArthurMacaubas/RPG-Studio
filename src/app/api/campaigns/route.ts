import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignService } from '@/services/campaignService';

const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(120),
  description: z.string().max(2000).optional(),
  system: z.enum(['ORDEM_PARANORMAL', 'DND_5E', 'CUSTOM'])
});

export async function GET(req: NextRequest) {
  try {
    const includeArchived = req.nextUrl.searchParams.get('archived') === 'true';
    return NextResponse.json(await campaignService.list({ includeArchived }));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar as campanhas.');
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationErrorResponse();
  }
  try {
    const campaign = await campaignService.create(parsed.data);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar a campanha.');
  }
}
