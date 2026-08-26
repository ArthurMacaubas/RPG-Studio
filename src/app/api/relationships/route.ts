import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { relationshipService } from '@/services/relationshipService';

const relationshipKindSchema = z.enum(['GENERIC', 'LEADS_TO', 'BELONGS_TO', 'CONTAINS', 'BLOCKS', 'UNLOCKS']);
const importanceSchema = z.enum(['CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL']);
const visibilitySchema = z.enum(['GM', 'ALL', 'P1', 'P2', 'P3', 'P4']);
const createSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  typeId: z.string().min(1).optional(),
  typeKey: z.string().trim().min(1).max(64).optional(),
  kind: relationshipKindSchema.optional(),
  label: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  importance: importanceSchema.optional(),
  visibility: visibilitySchema.optional()
});
const querySchema = z.object({ fileId: z.string().min(1) });

export async function GET(req: NextRequest) {
  try {
    const parsed = querySchema.safeParse({ fileId: req.nextUrl.searchParams.get('fileId') });
    if (!parsed.success) return NextResponse.json({ error: 'Informe fileId para consultar relacionamentos.' }, { status: 400 });
    return NextResponse.json(await relationshipService.getForEntity(parsed.data.fileId));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar os relacionamentos.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const relationship = await relationshipService.create(parsed.data);
    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o relacionamento.');
  }
}
