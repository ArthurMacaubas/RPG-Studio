import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { clearSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível sair.');
  }
}
