import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fileService } from '@/services/fileService';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';

const schema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const comment = await fileService.addComment(params.id, parsed.data.body);
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
