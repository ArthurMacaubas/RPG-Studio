import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { relationshipService } from '@/services/relationshipService';

const createSchema = z.object({
  key: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  directional: z.boolean().optional(),
  color: z.string().trim().max(32).optional(),
  icon: z.string().trim().max(48).optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await relationshipService.listTypes(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível listar os tipos de relacionamento.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await relationshipService.createType(params.id, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o tipo de relacionamento.');
  }
}
