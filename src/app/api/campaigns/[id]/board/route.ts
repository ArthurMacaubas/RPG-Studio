import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardService } from '@/services/boardService';

const finiteNumber = z.number().finite().min(-100000).max(100000);
const nodeSchema = z.object({ fileId: z.string().min(1), x: finiteNumber, y: finiteNumber });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await boardService.get(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar o quadro.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = nodeSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const node = await boardService.upsertNode(params.id, parsed.data.fileId, parsed.data.x, parsed.data.y);
    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível adicionar o arquivo ao quadro.');
  }
}
