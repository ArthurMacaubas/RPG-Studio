import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dryRunCampaignImport } from '@/services/campaignTransferService';

const schema = z.object({
  document: z.unknown(),
  identityMode: z.enum(['REMAP', 'PRESERVE_WHEN_AVAILABLE']).default('REMAP')
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ valid: false, errors: ['O corpo da requisição de dry run é inválido.'], issues: [{ path: 'body', value: null, rule: 'request.importDryRun', message: 'O corpo da requisição de dry run é inválido.' }], warnings: [], summary: { files: 0, tags: 0, relationships: 0, sessions: 0, timelineEvents: 0, boardNodes: 0, boardEdges: 0 } }, { status: 400 });
    const dryRun = dryRunCampaignImport(parsed.data.document, { identityMode: parsed.data.identityMode });
    return NextResponse.json(dryRun, { status: dryRun.canImport ? 200 : 422 });
  } catch {
    return NextResponse.json(
      {
        valid: false,
        errors: ['O corpo da requisição precisa conter JSON válido.'],
        warnings: [],
        summary: { files: 0, tags: 0, relationships: 0, sessions: 0, timelineEvents: 0, boardNodes: 0, boardEdges: 0 }
      },
      { status: 422 }
    );
  }
}
