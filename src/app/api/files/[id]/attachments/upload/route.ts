import { apiErrorResponse } from '@/lib/apiErrors';
import { assertFileAccess } from '@/lib/access';
import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/services/fileService';
import { mediaService } from '@/services/mediaService';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo de imagem.' }, { status: 422 });

    const labelValue = form.get('label');
    const label = typeof labelValue === 'string' && labelValue.trim() ? labelValue.trim().slice(0, 120) : file.name.slice(0, 120);
    const target = await assertFileAccess(params.id, { write: true });
    const asset = await mediaService.upload({ campaignId: target.campaignId, file, displayName: label });
    await mediaService.attach(target.campaignId, asset.id, { fileId: params.id, purpose: 'CONTENT' });
    const attachment = await fileService.addAttachment(params.id, { url: asset.url, label, mimeType: asset.mimeType });
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
