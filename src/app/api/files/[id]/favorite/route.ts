import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { fileService } from '@/services/fileService';

const schema = z.object({
  isFavorite: z.boolean().optional(),
  folderId: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const file = await fileService.setFavorite(params.id, parsed.data.isFavorite ?? true, parsed.data.folderId);
    return NextResponse.json(file);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o favorito.');
  }
}
