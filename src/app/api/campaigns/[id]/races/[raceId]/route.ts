import { apiErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { customSystemService } from '@/services/customSystemService';

export async function DELETE(_req: NextRequest, { params }: { params: { raceId: string } }) {
  try {
    await customSystemService.removeRace(params.raceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
