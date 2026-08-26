import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, assertFileAccess, getCampaignAccess } from '@/lib/access';
import { getViewerContext, publishedFileWhere } from '@/lib/publicationPolicy';

export interface CreateTagInput {
  campaignId: string;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  icon?: string;
  description?: string;
}

export const tagService = {
  async list(campaignId: string) {
    const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
    return prisma.tag.findMany({ where: { campaignId, ...(viewer.kind === 'OWNER' ? {} : { files: { some: { file: publishedFileWhere(viewer) } } }) }, orderBy: { name: 'asc' } });
  },

  async create(input: CreateTagInput) {
    await assertCampaignAccess(input.campaignId, { write: true });
    return prisma.tag.create({ data: input });
  },

  async update(id: string, input: UpdateTagInput) {
    const tag = await prisma.tag.findUnique({ where: { id }, select: { campaignId: true } });
    if (!tag) throw Object.assign(new Error('Tag não encontrada.'), { status: 404 });
    await assertCampaignAccess(tag.campaignId, { write: true });
    return prisma.tag.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    const tag = await prisma.tag.findUnique({ where: { id }, select: { campaignId: true } });
    if (!tag) throw Object.assign(new Error('Tag não encontrada.'), { status: 404 });
    await assertCampaignAccess(tag.campaignId, { write: true });
    return prisma.tag.delete({ where: { id } });
  },

  async setFileTags(fileId: string, tagIds: string[]) {
    const file = await assertFileAccess(fileId, { write: true });
    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, campaignId: true } });
    if (tags.length !== new Set(tagIds).size || tags.some((tag) => tag.campaignId !== file.campaignId)) {
      throw Object.assign(new Error('Todas as tags precisam existir e pertencer à campanha do arquivo.'), { status: 422 });
    }
    return prisma.$transaction([
      prisma.fileTag.deleteMany({ where: { fileId } }),
      prisma.fileTag.createMany({ data: tagIds.map((tagId) => ({ fileId, tagId })) })
    ]);
  }
};
