import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { computeCampaignHealth } from '@/services/campaignHealthService';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await computeCampaignHealth(params.id));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível analisar a campanha.');
  }
}
