import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { searchService } from '@/services/searchService';

const schema = z.object({ q: z.string().max(80).default('') });

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse({ q: request.nextUrl.searchParams.get('q') ?? '' });
  if (!parsed.success) return apiValidationErrorResponse();
  try {
    return NextResponse.json(await searchService.search(parsed.data.q));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível realizar a busca.');
  }
}
