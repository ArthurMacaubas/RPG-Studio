import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fileService } from '@/services/fileService';

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['archive', 'restore', 'trash', 'restoreFromTrash', 'permanentDelete'])
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const result = await fileService.bulk(parsed.data.ids, parsed.data.action);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
