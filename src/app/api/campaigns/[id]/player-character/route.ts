import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { playerCharacterService } from '@/services/playerCharacterService';

const createSchema = z.object({ name: z.string().trim().min(1).max(160) });

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ character: await playerCharacterService.getMine(params.id) });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar sua ficha.');
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Informe um nome válido para o personagem.' }, { status: 400 });
  try {
    return NextResponse.json({ character: await playerCharacterService.create(params.id, parsed.data.name) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar sua ficha.');
  }
}
