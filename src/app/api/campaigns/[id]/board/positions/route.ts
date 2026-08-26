import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardService } from '@/services/boardService';

const finiteCoordinate = z.number().finite().min(-100000).max(100000);
const positionsSchema = z.object({
  positions: z.array(z.object({ fileId: z.string().min(1), x: finiteCoordinate, y: finiteCoordinate })).min(1).max(120)
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = positionsSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardService.updatePositions(params.id, parsed.data.positions));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível salvar as posições do quadro.');
  }
}
