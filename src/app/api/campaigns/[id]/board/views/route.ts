import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardViewService } from '@/services/boardViewService';

const kindSchema = z.enum(['SESSION', 'CASE', 'ARC']);
const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: kindSchema,
  description: z.string().trim().max(1000).nullable().optional(),
  order: z.number().int().min(0).max(100000).optional(),
  snapshot: z.object({}).passthrough()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await boardViewService.list(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar as vistas salvas.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardViewService.create(params.id, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar a vista salva.');
  }
}
