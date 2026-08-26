import { apiErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { customSystemService } from '@/services/customSystemService';

export async function DELETE(_req: NextRequest, { params }: { params: { skillId: string } }) {
  try {
    await customSystemService.removeSkill(params.skillId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
