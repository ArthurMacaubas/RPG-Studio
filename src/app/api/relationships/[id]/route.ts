import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { relationshipService } from '@/services/relationshipService';

const relationshipKindSchema = z.enum(['GENERIC', 'LEADS_TO', 'BELONGS_TO', 'CONTAINS', 'BLOCKS', 'UNLOCKS']);
const importanceSchema = z.enum(['CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL']);
const visibilitySchema = z.enum(['GM', 'ALL', 'P1', 'P2', 'P3', 'P4']);
const updateSchema = z.object({
  typeId: z.string().min(1).optional(),
  typeKey: z.string().trim().min(1).max(64).optional(),
  kind: relationshipKindSchema.optional(),
  label: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  importance: importanceSchema.optional(),
  visibility: visibilitySchema.optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await relationshipService.get(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar o relacionamento.');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const relationship = await relationshipService.update(params.id, parsed.data);
    return NextResponse.json(relationship);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o relacionamento.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await relationshipService.remove(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível excluir o relacionamento.');
  }
}
