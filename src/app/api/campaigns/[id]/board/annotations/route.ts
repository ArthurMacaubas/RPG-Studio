import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardAnnotationService } from '@/services/boardAnnotationService';

const coordinate = z.number().finite().min(-100000).max(100000);
const color = z.string().trim().regex(/^#[0-9a-f]{6}$/i);
const pinSchema = z.object({ kind: z.literal('pin'), text: z.string().trim().min(1).max(280), x: coordinate, y: coordinate, color: color.optional() });
const groupSchema = z.object({ kind: z.literal('group'), name: z.string().trim().min(1).max(120), color: color.optional(), x: coordinate, y: coordinate, width: z.number().finite().min(80).max(5000).optional(), height: z.number().finite().min(80).max(5000).optional(), boardNodeIds: z.array(z.string().min(1)).max(500).optional() });
const createSchema = z.discriminatedUnion('kind', [pinSchema, groupSchema]);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await boardAnnotationService.list(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar as anotações do quadro.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    if (parsed.data.kind === 'pin') {
      const { kind: _kind, ...input } = parsed.data;
      return NextResponse.json(await boardAnnotationService.createPin(params.id, input), { status: 201 });
    }
    const { kind: _kind, ...input } = parsed.data;
    return NextResponse.json(await boardAnnotationService.createGroup(params.id, input), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar a anotação do quadro.');
  }
}
