import { apiErrorResponse, apiValidationErrorResponse } from '@/lib/apiErrors';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { favoriteFolderService } from '@/services/favoriteFolderService';

const schema = z.object({ fileId: z.string(), fromFolderId: z.string().optional() });

// Drag-and-drop drop target: adds a file to this folder, moving it out of
// fromFolderId when the drag originated from another folder.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return apiValidationErrorResponse();
    const entry = parsed.data.fromFolderId
      ? await favoriteFolderService.moveFile(parsed.data.fileId, parsed.data.fromFolderId, params.id)
      : await favoriteFolderService.addFile(params.id, parsed.data.fileId);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível concluir a operação.');
  }
}
