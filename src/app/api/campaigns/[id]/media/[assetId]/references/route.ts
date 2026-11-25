import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { mediaService } from '@/services/mediaService';

const schema = z.object({
  fileId: z.string().min(1),
  purpose: z.enum(['COVER', 'PRIMARY', 'CONTENT', 'GALLERY', 'MAP', 'MARKER']).default('CONTENT'),
  position: z.number().int().min(0).max(999).optional(),
  caption: z.string().trim().max(500).optional(),
  replace: z.boolean().optional()
}).strict();

export async function POST(request: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await mediaService.attach(params.id, params.assetId, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível vincular a mídia.');
  }
}
