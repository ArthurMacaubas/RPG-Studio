import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { assertOwnedCampaignForWrite } from '@/lib/access';

export const runtime = 'nodejs';
const MAX_THEME_IMAGE_BYTES = 600 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await assertOwnedCampaignForWrite(params.id);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo de imagem.' }, { status: 422 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Use PNG, JPEG, GIF ou WebP.' }, { status: 422 });
    if (file.size > MAX_THEME_IMAGE_BYTES) return NextResponse.json({ error: 'A imagem do tema deve ter no máximo 600 KB.' }, { status: 422 });
    const buffer = Buffer.from(await file.arrayBuffer());
    return NextResponse.json({ url: `data:${file.type};base64,${buffer.toString('base64')}` });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível enviar a imagem.');
  }
}
