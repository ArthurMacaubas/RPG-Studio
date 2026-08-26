import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { playerModeService } from '@/services/playerModeService';

const schema = z.object({ isVisible: z.boolean() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const visibility = await playerModeService.setFileVisibility(params.id, parsed.data.isVisible);
    return NextResponse.json(visibility);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível alterar a visibilidade do arquivo.');
  }
}
