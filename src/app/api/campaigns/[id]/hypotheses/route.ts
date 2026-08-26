import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { hypothesisService } from '@/services/hypothesisService';

const statusSchema = z.enum(['OPEN', 'SUPPORTED', 'REFUTED', 'RESOLVED']);
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(4000).nullable().optional()
});
const listQuerySchema = z.object({ status: statusSchema.optional() });

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = listQuerySchema.safeParse({ status: req.nextUrl.searchParams.get('status') ?? undefined });
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await hypothesisService.list(params.id, parsed.data.status));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar as hipóteses.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await hypothesisService.create(params.id, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar a hipótese.');
  }
}
