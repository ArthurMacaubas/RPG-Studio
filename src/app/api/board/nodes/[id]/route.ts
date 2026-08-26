import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardService } from '@/services/boardService';

const finiteNumber = z.number().finite().min(-100000).max(100000);
const schema = z.object({ fileId: z.string().min(1), x: finiteNumber, y: finiteNumber });

// id here is the fileId (nodes are keyed 1:1 by file).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const node = await boardService.moveNode(params.id, parsed.data.x, parsed.data.y);
    return NextResponse.json(node);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível mover o nó do quadro.');
  }
}
