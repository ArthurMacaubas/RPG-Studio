import type { CampaignFile, ExplorerScope, FileType, Tag } from '@/types';
import { measureServer } from '@/lib/performance';
import { fileService } from '@/services/fileService';
import { tagService } from '@/services/tagService';
import { getViewerContext } from '@/lib/publicationPolicy';

export interface FileExplorerInitialData {
  files: CampaignFile[];
  tags: Tag[];
  hasMore: boolean;
}

type FileListItem = Awaited<ReturnType<typeof fileService.list>>[number];

function serializeFile(file: FileListItem): CampaignFile {
  return {
    ...file,
    content: null,
    data: {},
    trashedAt: file.trashedAt?.toISOString() ?? null,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString()
  } as CampaignFile;
}

export async function getFileExplorerInitialData({
  campaignId,
  scope,
  fixedType
}: {
  campaignId: string;
  scope: ExplorerScope;
  fixedType?: FileType;
}): Promise<FileExplorerInitialData> {
  const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
  const [page, tags] = await Promise.all([
    measureServer('page.file-explorer.files', () => fileService.listPage({ campaignId, scope, type: fixedType, page: 0, pageSize: 40, viewer })),
    measureServer('page.file-explorer.tags', () => tagService.list(campaignId, viewer))
  ]);

  return {
    files: page.files.map(serializeFile),
    tags,
    hasMore: page.hasMore
  };
}
