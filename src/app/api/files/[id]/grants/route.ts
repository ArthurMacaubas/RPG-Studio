import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { fileGrantService } from '@/services/fileGrantService';

const schema = z.object({ userId: z.string().min(1), canView: z.boolean().default(true) });

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await fileGrantService.listForFile(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar os grants do arquivo.');
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiValidationErrorResponse();
  try {
    return NextResponse.json(await fileGrantService.grant(params.id, parsed.data.userId, parsed.data.canView), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível conceder acesso ao arquivo.');
  }
}
