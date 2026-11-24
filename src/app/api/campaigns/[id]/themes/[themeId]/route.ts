import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignThemeService } from '@/services/campaignThemeService';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  config: z.unknown().optional()
}).strict().refine((value) => value.name !== undefined || value.config !== undefined);

export async function PATCH(request: NextRequest, { params }: { params: { id: string; themeId: string } }) {
  try {
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await campaignThemeService.updateDraft(params.id, params.themeId, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível salvar o rascunho.');
  }
}
