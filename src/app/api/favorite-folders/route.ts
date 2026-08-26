import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { favoriteFolderService } from '@/services/favoriteFolderService';

const createSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(60),
  icon: z.string().optional(),
  color: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaignId');
    if (!campaignId) return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 });
    const folders = await favoriteFolderService.list(campaignId);
    return NextResponse.json(folders);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const folder = await favoriteFolderService.create(parsed.data);
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
