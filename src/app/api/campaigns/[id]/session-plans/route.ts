import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { sessionPlanningService } from '@/services/sessionPlanningService';

const inputSchema = z.object({
  name: z.string().trim().min(1).max(160),
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
    return NextResponse.json(await sessionPlanningService.list(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível consultar os planejamentos de sessão.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await sessionPlanningService.create(params.id, parsed.data), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o planejamento de sessão.');
  }
}
