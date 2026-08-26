import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    return NextResponse.json({ user: await getCurrentUser() });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a sessão.');
  }
}
