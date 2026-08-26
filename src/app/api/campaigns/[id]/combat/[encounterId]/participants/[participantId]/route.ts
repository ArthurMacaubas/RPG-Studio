import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { combatService } from '@/services/combatService';

const schema = z.object({
  hitPointDelta: z.number().int().min(-100000).max(100000).optional(),
  conditions: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  isVisibleToPlayers: z.boolean().optional()
}).refine((input) => input.hitPointDelta !== undefined || input.conditions !== undefined || input.isVisibleToPlayers !== undefined, { message: 'Informe ao menos uma alteração.' });

export async function PATCH(request: Request, { params }: { params: { id: string; encounterId: string; participantId: string } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Atualização de participante inválida.' }, { status: 400 });
    return NextResponse.json(await combatService.updateParticipant(params.id, params.encounterId, params.participantId, parsed.data));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o participante.');
  }
}
