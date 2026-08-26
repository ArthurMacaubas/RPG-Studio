import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fileService } from '@/services/fileService';
import type { FileType, SortField } from '@/types';

const fileTypeSchema = z.enum(['CAMPAIGN', 'NPC', 'CHARACTER', 'THREAT', 'PUZZLE', 'DOCUMENT', 'CLUE', 'OBJECT', 'EVENT', 'SESSION', 'MAP', 'IMAGE', 'AUDIO', 'VIDEO', 'NOTE', 'LOCATION']);

const createSchema = z.object({
  type: fileTypeSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  content: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  tagIds: z.array(z.string().min(1)).optional()
});

const querySchema = z.object({
  scope: z.enum(['active', 'archived', 'trash']).default('active'),
  type: fileTypeSchema.optional(),
  tags: z.string().optional(),
  favorites: z.enum(['true', 'false']).optional(),
  search: z.string().max(240).optional(),
  sort: z.enum(['name', 'updatedAt', 'createdAt', 'type']).default('updatedAt'),
  dir: z.enum(['asc', 'desc']).default('desc')
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsed.success) return apiValidationErrorResponse();
    const sp = parsed.data;
    const files = await fileService.list({
      campaignId: params.id,
      scope: sp.scope,
      type: sp.type,
      tagIds: sp.tags?.split(',').filter(Boolean),
      favoritesOnly: sp.favorites === 'true',
      search: sp.search || undefined,
      sort: sp.sort,
      direction: sp.dir
    });
    return NextResponse.json(files);
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationErrorResponse();
    }
    const file = await fileService.create({
      campaignId: params.id,
      type: parsed.data.type,
      name: parsed.data.name,
      description: parsed.data.description,
      content: parsed.data.content,
      data: parsed.data.data,
      tagIds: parsed.data.tagIds
    });
    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
