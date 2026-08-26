import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardViewService } from '@/services/boardViewService';

const schema = z.object({ viewIds: z.array(z.string().trim().min(1)).max(200) });

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await boardViewService.reorder(params.id, parsed.data.viewIds));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível reordenar as vistas salvas.');
  }
}
