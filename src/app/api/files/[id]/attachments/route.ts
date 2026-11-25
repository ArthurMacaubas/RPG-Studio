import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fileService } from '@/services/fileService';

const schema = z.object({
  url: z.string().url().refine((value) => !value.toLowerCase().startsWith('data:'), 'Use a biblioteca de mídia para enviar imagens.'),
  label: z.string().max(120).optional(),
  mimeType: z.string().max(60).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const attachment = await fileService.addAttachment(params.id, parsed.data);
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
