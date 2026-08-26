import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { fileGrantService } from '@/services/fileGrantService';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const grant = await fileGrantService.revoke(params.id, params.userId);
    return NextResponse.json({ ok: true, grant });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível revogar o acesso ao arquivo.');
  }
}
