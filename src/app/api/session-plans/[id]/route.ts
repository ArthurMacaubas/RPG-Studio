import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { sessionPlanningService } from '@/services/sessionPlanningService';

const inputSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  date: z.string().datetime().nullable().optional(),
  summary: z.string().trim().max(4000).nullable().optional(),
  checklist: z.unknown().optional(),
  objectives: z.unknown().optional(),
  agenda: z.unknown().optional(),
  postSummary: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(['PLANNED', 'COMPLETED']).optional(),
  order: z.number().int().min(0).max(100000).optional(),
  fileIds: z.array(z.string()).max(100).optional(),
  hypothesisIds: z.array(z.string()).max(100).optional(),
  viewIds: z.array(z.string()).max(100).optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await sessionPlanningService.getById(params.id);
    return NextResponse.json(session);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar o planejamento de sessão.');
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const session = await sessionPlanningService.updateFromId(params.id, parsed.data);
    return NextResponse.json(session);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível atualizar o planejamento de sessão.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sessionPlanningService.removeFromId(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível remover o planejamento de sessão.');
  }
}
