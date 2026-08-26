import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { playerCharacterService } from '@/services/playerCharacterService';

const schema = z.object({ data: z.record(z.unknown()) });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos para a ficha.' }, { status: 400 });
  try {
    return NextResponse.json(await playerCharacterService.updateMine(params.id, parsed.data.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível salvar sua ficha.');
  }
}
