import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, PublicApiError } from '@/lib/apiErrors';
import {
  CampaignTransferError,
  importCampaign
} from '@/services/campaignTransferService';
import { requireUser } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  document: z.unknown(),
  identityMode: z.enum(['REMAP', 'PRESERVE_WHEN_AVAILABLE']).default('REMAP'),
  confirm: z.literal(true)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiErrorResponse(new PublicApiError(400, 'INVALID_REQUEST', 'A importação precisa ser confirmada após um dry run válido.'));
    const user = await requireUser();
    const result = await importCampaign(user.id, parsed.data.document, { identityMode: parsed.data.identityMode });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CampaignTransferError) {
      return apiErrorResponse(new PublicApiError(422, 'IMPORT_VALIDATION', 'A importação contém dados inválidos.'));
    }
    return apiErrorResponse(error, 'Não foi possível importar a campanha.');
  }
}
