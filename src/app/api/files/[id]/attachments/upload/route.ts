import { apiErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/services/fileService';

export const runtime = 'nodejs';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo de imagem.' }, { status: 422 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Apenas imagens podem ser enviadas.' }, { status: 422 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'A imagem deve ter no máximo 5 MB.' }, { status: 422 });

    const labelValue = form.get('label');
    const label = typeof labelValue === 'string' && labelValue.trim() ? labelValue.trim().slice(0, 120) : file.name.slice(0, 120);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = `data:${file.type};base64,${buffer.toString('base64')}`;
    const attachment = await fileService.addAttachment(params.id, { url, label, mimeType: file.type });
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
