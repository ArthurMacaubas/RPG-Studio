import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { mediaService } from '@/services/mediaService';

const schema = z.object({ fileId: z.string().min(1), referenceIds: z.array(z.string().min(1)).min(1).max(1000) }).strict();

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await mediaService.reorderGallery(params.id, parsed.data.fileId, parsed.data.referenceIds));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível reordenar a galeria.');
  }
}
