import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { timelineService } from '@/services/timelineService';

const schema = z.object({
  title: z.string().min(1).max(160),
  happenedAt: z.string().datetime({ offset: true }),
  fileId: z.string().optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await timelineService.list(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a timeline.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const event = await timelineService.create({
      campaignId: params.id,
      title: parsed.data.title,
      happenedAt: new Date(parsed.data.happenedAt),
      fileId: parsed.data.fileId
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível criar o evento da timeline.');
  }
}
