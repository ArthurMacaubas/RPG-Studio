import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, assertFileAccess, getCampaignAccess } from '@/lib/access';

export interface CreateFavoriteFolderInput {
  campaignId: string;
  name: string;
  icon?: string;
  color?: string;
}

export const favoriteFolderService = {
  async list(campaignId: string) {
    const access = await getCampaignAccess(campaignId);
    if (access.role !== 'OWNER') return [];
    return prisma.favoriteFolder.findMany({
      where: { campaignId },
      orderBy: { order: 'asc' },
      include: { entries: { include: { file: true }, orderBy: { order: 'asc' } } }
    });
  },

  async create(input: CreateFavoriteFolderInput) {
    await assertCampaignAccess(input.campaignId, { write: true });
    const last = await prisma.favoriteFolder.findFirst({
      where: { campaignId: input.campaignId },
      orderBy: { order: 'desc' }
    });
    return prisma.favoriteFolder.create({
      data: { ...input, order: (last?.order ?? -1) + 1 }
    });
  },

  async update(id: string, input: { name?: string; icon?: string; color?: string; isCollapsed?: boolean }) {
    const folder = await prisma.favoriteFolder.findUnique({ where: { id }, select: { campaignId: true } });
    if (!folder) throw Object.assign(new Error('Pasta favorita não encontrada.'), { status: 404 });
    await assertCampaignAccess(folder.campaignId, { write: true });
    return prisma.favoriteFolder.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    const folder = await prisma.favoriteFolder.findUnique({ where: { id }, select: { campaignId: true } });
    if (!folder) throw Object.assign(new Error('Pasta favorita não encontrada.'), { status: 404 });
    await assertCampaignAccess(folder.campaignId, { write: true });
    return prisma.favoriteFolder.delete({ where: { id } });
  },

  async reorder(folderIds: string[]) {
    const folders = await prisma.favoriteFolder.findMany({ where: { id: { in: folderIds } }, select: { id: true, campaignId: true } });
    if (folders.length !== new Set(folderIds).size) throw Object.assign(new Error('Uma ou mais pastas favoritas não foram encontradas.'), { status: 404 });
    const campaignIds = new Set(folders.map((folder) => folder.campaignId));
    if (campaignIds.size !== 1) throw Object.assign(new Error('As pastas precisam pertencer à mesma campanha.'), { status: 422 });
    await assertCampaignAccess(folders[0]!.campaignId, { write: true });
    return prisma.$transaction(
      folderIds.map((id, order) => prisma.favoriteFolder.update({ where: { id }, data: { order } }))
    );
  },

  async addFile(folderId: string, fileId: string) {
    const [folder, file] = await Promise.all([
      prisma.favoriteFolder.findUnique({ where: { id: folderId }, select: { id: true, campaignId: true } }),
      prisma.campaignFile.findUnique({ where: { id: fileId }, select: { id: true, campaignId: true, isTrashed: true } })
    ]);
    if (!folder || !file) {
      const error = new Error('Pasta ou arquivo favorito não encontrado.') as Error & { status: number };
      error.status = 404;
      throw error;
    }
    if (file.isTrashed || folder.campaignId !== file.campaignId) {
      const error = new Error('Pasta e arquivo precisam pertencer à mesma campanha e estar disponíveis.') as Error & { status: number };
      error.status = 422;
      throw error;
    }
    const last = await prisma.favoriteEntry.findFirst({ where: { folderId }, orderBy: { order: 'desc' } });
    await prisma.campaignFile.update({ where: { id: fileId }, data: { isFavorite: true } });
    return prisma.favoriteEntry.upsert({
      where: { folderId_fileId: { folderId, fileId } },
      create: { folderId, fileId, order: (last?.order ?? -1) + 1 },
      update: {}
    });
  },

  // moving between folders (drag and drop) = remove from old, add to new
  async moveFile(fileId: string, fromFolderId: string, toFolderId: string) {
    await assertFileAccess(fileId, { write: true });
    await prisma.favoriteEntry.deleteMany({ where: { folderId: fromFolderId, fileId } });
    return favoriteFolderService.addFile(toFolderId, fileId);
  },

  async removeFile(folderId: string, fileId: string) {
    await assertFileAccess(fileId, { write: true });
    await prisma.favoriteEntry.deleteMany({ where: { folderId, fileId } });
    const remaining = await prisma.favoriteEntry.count({ where: { fileId } });
    if (remaining === 0) {
      await prisma.campaignFile.update({ where: { id: fileId }, data: { isFavorite: false } });
    }
  },

  async reorderEntries(folderId: string, fileIdsInOrder: string[]) {
    const folder = await prisma.favoriteFolder.findUnique({ where: { id: folderId }, select: { campaignId: true } });
    if (!folder) throw Object.assign(new Error('Pasta favorita não encontrada.'), { status: 404 });
    await assertCampaignAccess(folder.campaignId, { write: true });
    await Promise.all(fileIdsInOrder.map((fileId) => assertFileAccess(fileId, { write: true })));
    return prisma.$transaction(
      fileIdsInOrder.map((fileId, order) =>
        prisma.favoriteEntry.update({
          where: { folderId_fileId: { folderId, fileId } },
          data: { order }
        })
      )
    );
  }
};
