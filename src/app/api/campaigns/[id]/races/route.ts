import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { customSystemService } from '@/services/customSystemService';

const schema = z.object({ name: z.string().min(1).max(40), description: z.string().max(300).optional() });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await customSystemService.listRaces(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const item = await customSystemService.createRace(params.id, parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
