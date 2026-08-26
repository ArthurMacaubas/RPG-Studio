import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { playerModeService } from '@/services/playerModeService';

const schema = z.object({ isEnabled: z.boolean() });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const config = await playerModeService.getOrCreateConfig(params.id);
    const visibility = await playerModeService.listVisibility(params.id);
    return NextResponse.json({ config, files: visibility });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const config = await playerModeService.setEnabled(params.id, parsed.data.isEnabled);
    return NextResponse.json(config);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
