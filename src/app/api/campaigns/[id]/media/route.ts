import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { MAX_MEDIA_FILES, mediaCategorySchema, mediaTagsSchema, mediaVisibilitySchema } from '@/lib/media';
import { mediaService } from '@/services/mediaService';

export const runtime = 'nodejs';

const querySchema = z.object({
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(60).optional(),
  mimeType: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(60).default(30),
  sort: z.enum(['updatedAt', 'createdAt', 'displayName', 'byteSize']).default('updatedAt'),
  dir: z.enum(['asc', 'desc']).default('desc')
});

function optionalText(value: FormDataEntryValue | null, max: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}

function formTags(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return [];
  const parsed = JSON.parse(value);
  return mediaTagsSchema.parse(parsed);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) return apiValidationErrorResponse();
    return NextResponse.json(await mediaService.list({ campaignId: params.id, ...parsed.data, direction: parsed.data.dir }));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a biblioteca de mídia.');
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await request.formData();
    const files = form.getAll('file').filter((value): value is File => value instanceof File);
    if (!files.length || files.length > MAX_MEDIA_FILES) return NextResponse.json({ error: `Envie entre 1 e ${MAX_MEDIA_FILES} imagens por vez.` }, { status: 422 });
    const categoryValue = form.get('category');
    const visibilityValue = form.get('visibility');
    const category = mediaCategorySchema.parse(typeof categoryValue === 'string' && categoryValue ? categoryValue : undefined);
    const visibility = mediaVisibilitySchema.parse(typeof visibilityValue === 'string' && visibilityValue ? visibilityValue : 'PRIVATE');
    const tags = formTags(form.get('tags'));
    const uploaded = await Promise.all(files.map((file) => mediaService.upload({
      campaignId: params.id,
      file,
      displayName: optionalText(form.get('displayName'), 160),
      description: optionalText(form.get('description'), 2000),
      altText: optionalText(form.get('altText'), 500),
      category,
      tags,
      visibility
    })));
    return NextResponse.json({ items: uploaded }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível enviar a mídia.');
  }
}
