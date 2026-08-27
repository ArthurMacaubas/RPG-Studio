import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignBriefingService } from '@/services/campaignBriefingService';

const saveSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(20000)
});

const publicationSchema = z.object({ isPublished: z.boolean() });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ briefing: await campaignBriefingService.getAdmin(params.id) });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar o briefing.');
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = saveSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await campaignBriefingService.save(params.id, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível salvar o briefing.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = publicationSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await campaignBriefingService.setPublished(params.id, parsed.data.isPublished));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível alterar a publicação do briefing.');
  }
}
