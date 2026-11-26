import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { mediaService } from '@/services/mediaService';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const { asset, object } = await mediaService.readForCurrentUser(params.assetId);
    if (!object) return NextResponse.json({ error: 'Mídia não encontrada.' }, { status: 404 });
    return new NextResponse(object.stream, {
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': String(object.blob.size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a mídia.');
  }
}
