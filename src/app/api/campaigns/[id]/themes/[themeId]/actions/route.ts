import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignThemeService } from '@/services/campaignThemeService';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('publish') }).strict(),
  z.object({ action: z.literal('apply') }).strict(),
  z.object({ action: z.literal('restore') }).strict(),
  z.object({ action: z.literal('duplicate'), name: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal('savePreset'), name: z.string().trim().min(1).max(80) }).strict()
]);

export async function POST(request: NextRequest, { params }: { params: { id: string; themeId: string } }) {
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const input = parsed.data;
    if (input.action === 'publish') return NextResponse.json(await campaignThemeService.publish(params.id, params.themeId));
    if (input.action === 'apply') return NextResponse.json(await campaignThemeService.apply(params.id, params.themeId));
    if (input.action === 'restore') return NextResponse.json(await campaignThemeService.restoreDefault(params.id, params.themeId));
    if (input.action === 'duplicate') return NextResponse.json(await campaignThemeService.duplicate(params.id, params.themeId, input.name), { status: 201 });
    return NextResponse.json(await campaignThemeService.savePreset(params.id, params.themeId, input.name), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a ação do tema.');
  }
}
