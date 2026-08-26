import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { combatService } from '@/services/combatService';

const schema = z.object({ action: z.enum(['START', 'ADVANCE', 'END']) });

export async function POST(request: Request, { params }: { params: { id: string; encounterId: string } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Ação de combate inválida.' }, { status: 400 });
    const result = parsed.data.action === 'START'
      ? await combatService.start(params.id, params.encounterId)
      : parsed.data.action === 'ADVANCE'
        ? await combatService.advance(params.id, params.encounterId)
        : await combatService.end(params.id, params.encounterId);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível executar a ação de combate.');
  }
}
