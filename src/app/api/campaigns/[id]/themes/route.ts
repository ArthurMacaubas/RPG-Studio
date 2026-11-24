import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { campaignThemeService } from '@/services/campaignThemeService';

const createSchema = z.object({
  action: z.enum(['create', 'import']).default('create'),
  name: z.string().trim().min(1).max(80),
  presetId: z.string().min(1).max(120).optional(),
  config: z.unknown().optional()
}).strict();

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await campaignThemeService.list(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a aparência da campanha.');
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success || (parsed.data.action === 'import' && parsed.data.config === undefined)) return apiValidationErrorResponse();
    return NextResponse.json(await campaignThemeService.create(params.id, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o tema.');
  }
}
