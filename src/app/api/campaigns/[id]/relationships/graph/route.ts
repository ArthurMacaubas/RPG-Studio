import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { relationshipService } from '@/services/relationshipService';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_FILE_IDS = 100;

function requestedFileIds(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('fileIds');
  if (raw === null) return undefined;
  if (!raw) return [];
  const ids = raw.split(',').map((value) => value.trim());
  if (ids.length > MAX_FILE_IDS || ids.some((id) => !ID_PATTERN.test(id)) || new Set(ids).size !== ids.length) return null;
  return ids;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const fileIds = requestedFileIds(req);
    if (fileIds === null) return apiValidationErrorResponse();
    return NextResponse.json(await relationshipService.getGraph(params.id, fileIds));
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível obter o grafo oficial da campanha.');
  }
}
