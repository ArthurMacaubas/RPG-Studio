import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fileService } from '@/services/fileService';

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).optional(),
  content: z.string().optional(),
  data: z.record(z.unknown()).optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const file = await fileService.get(params.id);
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    return NextResponse.json(file);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationErrorResponse();
    }
    const file = await fileService.update(params.id, parsed.data);
    return NextResponse.json(file);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

// Permanent delete — the UI only exposes this from the Lixeira screen.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await fileService.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
