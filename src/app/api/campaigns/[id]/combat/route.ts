import { CombatParticipantKind } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { combatService } from '@/services/combatService';

const participantSchema = z.object({
  sourceFileId: z.string().cuid().optional(),
  name: z.string().trim().max(120).default(''),
  kind: z.nativeEnum(CombatParticipantKind),
  initiative: z.number().int().min(-100).max(1000),
  initiativeBonus: z.number().int().min(-100).max(100).optional(),
  currentHp: z.number().int().min(0).max(100000).nullable().optional(),
  maxHp: z.number().int().min(0).max(100000).nullable().optional(),
  conditions: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  isVisibleToPlayers: z.boolean().optional()
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sessionId: z.string().cuid().optional(),
  participants: z.array(participantSchema).min(1).max(40)
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await combatService.listForCampaign(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível listar os encontros.');
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos para criar o encontro.' }, { status: 400 });
    return NextResponse.json(await combatService.create(params.id, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o encontro.');
  }
}
