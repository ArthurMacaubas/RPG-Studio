import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { boardService } from '@/services/boardService';

const schema = z.object({
  campaignId: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  label: z.string().trim().max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().trim().max(400).optional(),
  curve: z.number().min(-180).max(180).optional()
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const edge = await boardService.createEdge(parsed.data);
    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar a conexão visual.');
  }
}
