import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rawTake = Number(request.nextUrl.searchParams.get('take') ?? '80');
    const take = Number.isFinite(rawTake) ? rawTake : 80;
    return NextResponse.json(await auditService.listForCampaign(params.id, take));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível carregar a auditoria da campanha.');
  }
}
