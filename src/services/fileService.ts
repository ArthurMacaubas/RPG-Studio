import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { FileType, SortField } from '@/types';
import { assertCampaignAccess, assertFileAccess, getCampaignAccess } from '@/lib/access';
import { logHistory } from './historyService';
import { favoriteFolderService } from './favoriteFolderService';
import { requireUser } from '@/lib/auth';
import { recordAudit } from '@/services/auditService';
import { getViewerContext, publishedFileWhere, publicationSelect } from '@/lib/publicationPolicy';

export interface ListFilesParams {
  campaignId: string;
  scope?: 'active' | 'archived' | 'trash';
  type?: FileType;
  tagIds?: string[];
  favoritesOnly?: boolean;
  search?: string;
  sort?: SortField;
  direction?: 'asc' | 'desc';
}

export interface CreateFileInput {
  campaignId: string;
  type: FileType;
  name: string;
  description?: string;
  content?: string;
  data?: Record<string, unknown>;
  tagIds?: string[];
  authorId?: string;
}

export interface UpdateFileInput {
  name?: string;
  description?: string;
  content?: string;
  data?: Record<string, unknown>;
}

async function getOrCreateDefaultFavoriteFolderId(campaignId: string): Promise<string> {
  const defaultFolder = await prisma.favoriteFolder.findFirst({
    where: { campaignId },
    orderBy: { order: 'asc' },
    select: { id: true }
  });
  if (defaultFolder) return defaultFolder.id;

  const createdFolder = await favoriteFolderService.create({ campaignId, name: 'Favoritos' });
  return createdFolder.id;
}

// Every mutation below writes a FileHistoryEntry via historyService so the
// editor's "Histórico" tab is always complete — callers never need to log
// manually. See relationshipService/tagService for the same rule applied
// to relationships and tags.
export const fileService = {
  async list({
    campaignId,
    scope = 'active',
    type,
    tagIds,
    favoritesOnly,
    search,
    sort = 'updatedAt',
    direction = 'desc'
  }: ListFilesParams) {
    const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
    return prisma.campaignFile.findMany({
      where: {
        ...publishedFileWhere(viewer),
        type,
        isTrashed: viewer.kind === 'OWNER' ? scope === 'trash' : false,
        isArchived: viewer.kind === 'OWNER' ? scope === 'archived' ? true : scope === 'active' ? false : undefined : false,
        isFavorite: favoritesOnly ? true : undefined,
        tags: tagIds?.length ? { some: { tagId: { in: tagIds } } } : undefined,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { id: { equals: search } }
            ]
          : undefined
      },
      include: { tags: { include: { tag: true } } },
      orderBy: { [sort]: direction }
    });
  },

  async countsByType(campaignId: string) {
    const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
    return prisma.campaignFile.groupBy({
      by: ['type'],
      where: { ...publishedFileWhere(viewer), isTrashed: false, isArchived: false },
      _count: { _all: true }
    });
  },

  async get(id: string) {
    const identity = await prisma.campaignFile.findUnique({ where: { id }, select: { campaignId: true } });
    if (!identity) return null;
    const viewer = await getViewerContext(identity.campaignId, { requirePlayerMode: true });
    if (viewer.kind !== 'OWNER') {
      return prisma.campaignFile.findFirst({
        where: { id, ...publishedFileWhere(viewer) },
        select: publicationSelect.file
      });
    }
    return prisma.campaignFile.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        attachments: true,
        comments: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { createdAt: 'desc' } },
        relationshipsFrom: { include: { to: true } },
        relationshipsTo: { include: { from: true } }
      }
    });
  },

  async create(input: CreateFileInput) {
    await assertCampaignAccess(input.campaignId, { write: true });
    const tagIds = [...new Set(input.tagIds ?? [])];
    if (tagIds.length !== (input.tagIds?.length ?? 0)) {
      throw Object.assign(new Error('A criação do arquivo contém IDs de tag duplicados.'), { status: 422 });
    }
    const file = await prisma.$transaction(async (tx) => {
      if (tagIds.length) {
        const tags = await tx.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, campaignId: true } });
        if (tags.length !== tagIds.length || tags.some((tag) => tag.campaignId !== input.campaignId)) {
          throw Object.assign(new Error('Todas as tags precisam existir e pertencer à mesma campanha do arquivo.'), { status: 422 });
        }
      }
      return tx.campaignFile.create({
        data: {
          campaignId: input.campaignId,
          type: input.type,
          name: input.name,
          description: input.description,
          content: input.content,
          data: (input.data ?? {}) as Prisma.InputJsonValue,
          authorId: input.authorId,
          tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined
        }
      });
    });
    await logHistory(file.id, 'created', `"${file.name}" criado`, input.authorId);
    return file;
  },

  async update(id: string, input: UpdateFileInput, authorId?: string) {
    await assertFileAccess(id, { includeTrashed: true, write: true });
    const file = await prisma.campaignFile.update({
      where: { id },
      data: {
        ...input,
        data: input.data as Prisma.InputJsonValue | undefined
      }
    });
    await logHistory(id, 'edited', undefined, authorId);
    return file;
  },

  async duplicate(id: string, authorId?: string) {
    await assertFileAccess(id, { includeTrashed: true, write: true });
    const original = await prisma.campaignFile.findUnique({
      where: { id },
      include: { tags: true }
    });
    if (!original) return null;
    const copy = await prisma.campaignFile.create({
      data: {
        campaignId: original.campaignId,
        type: original.type,
        name: `${original.name} (cópia)`,
        description: original.description,
        content: original.content,
        data: original.data ?? {},
        tags: { create: original.tags.map((t) => ({ tagId: t.tagId })) }
      }
    });
    await logHistory(copy.id, 'duplicated', `Duplicado de "${original.name}"`, authorId);
    return copy;
  },

  async setArchived(id: string, isArchived: boolean, authorId?: string) {
    await assertFileAccess(id, { includeTrashed: true, write: true });
    const file = await prisma.campaignFile.update({ where: { id }, data: { isArchived } });
    await logHistory(id, isArchived ? 'archived' : 'restored', undefined, authorId);
    return file;
  },

  async trash(id: string, authorId?: string) {
    await assertFileAccess(id, { includeTrashed: true, write: true });
    const file = await prisma.campaignFile.update({
      where: { id },
      data: { isTrashed: true, trashedAt: new Date() }
    });
    await logHistory(id, 'trashed', undefined, authorId);
    return file;
  },

  async restoreFromTrash(id: string, authorId?: string) {
    await assertFileAccess(id, { includeTrashed: true, write: true });
    const file = await prisma.campaignFile.update({
      where: { id },
      data: { isTrashed: false, trashedAt: null }
    });
    await logHistory(id, 'restored', 'Restaurado da lixeira', authorId);
    return file;
  },

  // Permanent delete — only reachable from the trash screen.
  async remove(id: string, authorId?: string) {
    const file = await assertFileAccess(id, { includeTrashed: true, write: true });
    const deleted = await prisma.campaignFile.delete({ where: { id } });
    const actorId = authorId ?? (await requireUser()).id;
    void recordAudit({ campaignId: file.campaignId, actorId, action: 'FILE_PERMANENTLY_DELETED', entityType: 'CampaignFile', entityId: id, metadata: { name: file.id } }).catch(() => undefined);
    return deleted;
  },

  async setFavorite(id: string, isFavorite: boolean, folderId?: string, authorId?: string) {
    await assertFileAccess(id, { write: true });
    const file = await prisma.campaignFile.update({ where: { id }, data: { isFavorite } });
    if (isFavorite) {
      const targetFolderId = folderId ?? await getOrCreateDefaultFavoriteFolderId(file.campaignId);
      await favoriteFolderService.addFile(targetFolderId, id);
    } else {
      await prisma.favoriteEntry.deleteMany({ where: { fileId: id } });
    }
    await logHistory(id, isFavorite ? 'favorited' : 'unfavorited', undefined, authorId);
    return file;
  },

  // Bulk actions power multi-select in the explorer toolbar.
  async bulk(ids: string[], action: 'archive' | 'restore' | 'trash' | 'restoreFromTrash' | 'permanentDelete', authorId?: string) {
    const uniqueIds = [...new Set(ids)];
    const checkedFiles = await Promise.all(uniqueIds.map((id) => assertFileAccess(id, { includeTrashed: true, write: true })));
    const actorId = authorId ?? (await requireUser()).id;
    switch (action) {
      case 'archive':
        await prisma.campaignFile.updateMany({ where: { id: { in: uniqueIds } }, data: { isArchived: true } });
        break;
      case 'restore':
        await prisma.campaignFile.updateMany({ where: { id: { in: uniqueIds } }, data: { isArchived: false } });
        break;
      case 'trash':
        await prisma.campaignFile.updateMany({
          where: { id: { in: uniqueIds } },
          data: { isTrashed: true, trashedAt: new Date() }
        });
        break;
      case 'restoreFromTrash':
        await prisma.campaignFile.updateMany({
          where: { id: { in: uniqueIds } },
          data: { isTrashed: false, trashedAt: null }
        });
        break;
      case 'permanentDelete':
        await prisma.campaignFile.deleteMany({ where: { id: { in: uniqueIds } } });
        await Promise.all(checkedFiles.map((file) => recordAudit({ campaignId: file.campaignId, actorId, action: 'FILE_PERMANENTLY_DELETED', entityType: 'CampaignFile', entityId: file.id }).catch(() => undefined)));
        break;
    }
    const historyAction =
      action === 'permanentDelete'
        ? null
        : action === 'restoreFromTrash'
          ? 'restored'
          : action === 'trash'
            ? 'trashed'
            : action === 'archive'
              ? 'archived'
              : action === 'restore'
                ? 'restored'
                : action;
    if (historyAction) {
      await Promise.all(uniqueIds.map((id) => logHistory(id, historyAction, 'Ação em lote', authorId)));
    }
    return { count: uniqueIds.length };
  },

  async addComment(fileId: string, body: string) {
    const identity = await prisma.campaignFile.findUnique({ where: { id: fileId }, select: { campaignId: true } });
    if (!identity) throw Object.assign(new Error('Arquivo não encontrado.'), { status: 404 });
    const viewer = await getViewerContext(identity.campaignId, { requirePlayerMode: true });
    const file = await prisma.campaignFile.findFirst({ where: { id: fileId, ...publishedFileWhere(viewer) }, select: { id: true, campaignId: true } });
    if (!file) throw Object.assign(new Error('Arquivo não encontrado.'), { status: 404 });
    const authorId = viewer.kind === 'PUBLIC' ? undefined : viewer.userId;
    if (!authorId) throw Object.assign(new Error('Autenticação obrigatória.'), { status: 401 });
    const comment = await prisma.comment.create({ data: { fileId, body, authorId } });
    void recordAudit({ campaignId: file.campaignId, actorId: authorId, action: 'FILE_COMMENT_CREATED', entityType: 'Comment', entityId: comment.id, metadata: { fileId } }).catch(() => undefined);
    return comment;
  },

  // Attachments support external URLs and small image uploads. The upload route
  // validates MIME and size before storing the image as a data URL attachment.
  async addAttachment(fileId: string, input: { url: string; label?: string; mimeType?: string }, authorId?: string) {
    const file = await assertFileAccess(fileId, { write: true });
    const attachment = await prisma.attachment.create({ data: { fileId, ...input } });
    await logHistory(fileId, 'edited', `Anexo adicionado: ${input.label ?? input.url}`, authorId);
    const actorId = authorId ?? (await requireUser()).id;
    void recordAudit({ campaignId: file.campaignId, actorId, action: 'FILE_ATTACHMENT_UPLOADED', entityType: 'Attachment', entityId: attachment.id, metadata: { fileId, mimeType: input.mimeType ?? null } }).catch(() => undefined);
    return attachment;
  },

  async removeAttachment(fileId: string, attachmentId: string, authorId?: string) {
    await assertFileAccess(fileId, { write: true });
    await prisma.attachment.delete({ where: { id: attachmentId, fileId } });
    await logHistory(fileId, 'edited', 'Anexo removido', authorId);
  }
};
