import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fileService } from '@/services/fileService';
import type { FileType, SortField } from '@/types';
import { withRouteTiming } from '@/lib/performance';

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
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(0).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(40),
  includeContent: z.enum(['true', 'false']).optional(),
  includeData: z.enum(['true', 'false']).optional()
});

export const GET = withRouteTiming('api.campaigns.files.GET', async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsed.success) return apiValidationErrorResponse();
    const sp = parsed.data;
    const input = {
      campaignId: params.id,
      scope: sp.scope,
      type: sp.type,
      tagIds: sp.tags?.split(',').filter(Boolean),
      favoritesOnly: sp.favorites === 'true',
      search: sp.search || undefined,
      sort: sp.sort,
      direction: sp.dir,
      includeContent: sp.includeContent === 'true',
      includeData: sp.includeData === 'true'
    } as const;
    if (sp.page !== undefined) {
      return NextResponse.json(await fileService.listPage({ ...input, page: sp.page, pageSize: sp.pageSize }));
    }
    return NextResponse.json(await fileService.list(input));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
});

export const POST = withRouteTiming('api.campaigns.files.POST', async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
});
