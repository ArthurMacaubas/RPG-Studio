import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tagService } from '@/services/tagService';

const createSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(40),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().max(300).optional()
});

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaignId');
    if (!campaignId) return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 });
    const tags = await tagService.list(campaignId);
    return NextResponse.json(tags);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const tag = await tagService.create(parsed.data);
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
