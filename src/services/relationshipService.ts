import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, getCampaignAccess } from '@/lib/access';
import { visibleRelationshipAudiences, type RelationshipViewer } from '@/lib/relationshipVisibility';
import { logHistory } from './historyService';
import type { RelationshipImportance, RelationshipKind, RelationshipVisibility } from '@/types';
import { Prisma } from '@prisma/client';
import { getPublicViewerContext, getViewerContext, publishedFileWhere, type ViewerContext } from '@/lib/publicationPolicy';

const LEGACY_KINDS: RelationshipKind[] = ['GENERIC', 'LEADS_TO', 'BELONGS_TO', 'CONTAINS', 'BLOCKS', 'UNLOCKS'];

export interface CreateRelationshipInput {
  fromId: string;
  toId: string;
  typeId?: string;
  typeKey?: string;
  kind?: RelationshipKind;
  label?: string;
  description?: string;
  importance?: RelationshipImportance;
  visibility?: RelationshipVisibility;
}

export interface UpdateRelationshipInput {
  typeId?: string;
  typeKey?: string;
  kind?: RelationshipKind;
  label?: string;
  description?: string;
  importance?: RelationshipImportance;
  visibility?: RelationshipVisibility;
}

export class RelationshipIntegrityError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'RelationshipIntegrityError';
    this.status = status;
  }
}

function legacyKindForType(key: string): RelationshipKind {
  return LEGACY_KINDS.includes(key as RelationshipKind) ? key as RelationshipKind : 'GENERIC';
}

function normalizedText(value: string | undefined, maxLength: number) {
  const text = value?.trim();
  if (text && text.length > maxLength) throw new RelationshipIntegrityError(`O texto pode ter no máximo ${maxLength} caracteres.`);
  return text || null;
}

async function assertFilePair(fromId: string, toId: string) {
  if (fromId === toId) throw new RelationshipIntegrityError('Um arquivo não pode se relacionar consigo mesmo.');
  const [from, to] = await Promise.all([
    prisma.campaignFile.findUnique({ where: { id: fromId }, select: { id: true, name: true, campaignId: true } }),
    prisma.campaignFile.findUnique({ where: { id: toId }, select: { id: true, name: true, campaignId: true } })
  ]);
  if (!from || !to) throw new RelationshipIntegrityError('Um ou ambos os arquivos não foram encontrados.', 404);
  if (from.campaignId !== to.campaignId) throw new RelationshipIntegrityError('Os arquivos precisam pertencer à mesma campanha.');
  await assertCampaignAccess(from.campaignId, { write: true });
  return { from, to };
}

async function resolveType(campaignId: string, input: Pick<CreateRelationshipInput | UpdateRelationshipInput, 'typeId' | 'typeKey' | 'kind'>) {
  let requestedKey = input.typeKey?.trim().toUpperCase() || input.kind;
  if (!input.typeId && !requestedKey) requestedKey = 'GENERIC';
  const type = input.typeId
    ? await prisma.relationshipType.findUnique({ where: { id: input.typeId } })
    : await prisma.relationshipType.findFirst({ where: { key: requestedKey, campaignId } })
      ?? await prisma.relationshipType.findFirst({ where: { key: requestedKey, campaignId: null } });
  if (!type || (type.campaignId !== null && type.campaignId !== campaignId)) throw new RelationshipIntegrityError('Tipo de relacionamento inválido ou indisponível nesta campanha.');
  return type;
}

function relationshipInclude() {
  return { from: true, to: true, type: true };
}

function relationshipNotFound() {
  return new RelationshipIntegrityError('Relacionamento não encontrado.', 404);
}

function isPrismaUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === 'P2002'
    : typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

function relationshipDuplicateConflict() {
  return new RelationshipIntegrityError('Já existe um relacionamento com esta origem, destino e tipo.', 409);
}

function normalizedEndpoints(fromId: string, toId: string, directional: boolean) {
  if (directional || fromId <= toId) return { fromId, toId };
  return { fromId: toId, toId: fromId };
}

function duplicateWhere(campaignId: string, fromId: string, toId: string, typeId: string, directional: boolean, excludeId?: string): Prisma.RelationshipWhereInput {
  const pair = normalizedEndpoints(fromId, toId, directional);
  const pairWhere = directional
    ? { fromId: pair.fromId, toId: pair.toId }
    : { OR: [{ fromId: pair.fromId, toId: pair.toId }, { fromId: pair.toId, toId: pair.fromId }] };
  return {
    campaignId,
    typeId,
    ...pairWhere,
    ...(excludeId ? { NOT: { id: excludeId } } : {})
  };
}

async function getRelationshipViewer(campaignId: string): Promise<Extract<ViewerContext, { kind: 'OWNER' | 'PLAYER' }>> {
  const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
  if (viewer.kind === 'OWNER') return viewer;
  if (viewer.kind !== 'PLAYER') throw new RelationshipIntegrityError('Contexto de visualização inválido.', 403);
  return viewer;
}

function relationshipViewer(viewer: ViewerContext): RelationshipViewer {
  return viewer.kind === 'OWNER'
    ? { role: 'OWNER', userId: viewer.userId, audience: null }
    : { role: 'PLAYER', userId: viewer.kind === 'PLAYER' ? viewer.userId : '', audience: viewer.kind === 'PLAYER' ? viewer.audience : null };
}

async function accessibleFileIds(viewer: Extract<ViewerContext, { kind: 'OWNER' | 'PLAYER' }>) {
  if (viewer.kind === 'OWNER') return null;
  const files = await prisma.campaignFile.findMany({
    where: publishedFileWhere(viewer),
    select: { id: true }
  });
  return files.map((file) => file.id);
}

async function accessibleFileIdsForViewer(viewer: Extract<ViewerContext, { kind: 'OWNER' | 'PLAYER' }>, candidateFileIds: string[]) {
  if (viewer.kind === 'OWNER') return candidateFileIds;
  const allowedFileIds = await accessibleFileIds(viewer);
  const allowed = new Set(allowedFileIds);
  return candidateFileIds.filter((fileId) => allowed.has(fileId));
}

async function accessiblePublicFileIds(viewer: Extract<ViewerContext, { kind: 'PUBLIC' }>, candidateFileIds: string[]) {
  if (candidateFileIds.length === 0) return [];
  const files = await prisma.campaignFile.findMany({
    where: {
      ...publishedFileWhere(viewer),
      id: { in: candidateFileIds },
    },
    select: { id: true }
  });
  return files.map((file) => file.id);
}

function visibleRelationshipWhere(campaignId: string, viewer: ViewerContext, fileIds: string[] | null): Prisma.RelationshipWhereInput {
  const audiences = visibleRelationshipAudiences(relationshipViewer(viewer));
  return {
    campaignId,
    ...(audiences ? { visibility: { in: audiences } } : {}),
    ...(fileIds ? { fromId: { in: fileIds }, toId: { in: fileIds } } : {})
  };
}

export const relationshipService = {
  async listTypes(campaignId: string) {
    await getViewerContext(campaignId, { requirePlayerMode: true });
    return prisma.relationshipType.findMany({
      where: { OR: [{ campaignId: null }, { campaignId }] },
      orderBy: [{ campaignId: 'asc' }, { name: 'asc' }]
    });
  },

  async createType(campaignId: string, input: { key: string; name: string; description?: string; directional?: boolean; color?: string; icon?: string }) {
    await assertCampaignAccess(campaignId, { write: true });
    const key = input.key.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!key || key.length > 64) throw new RelationshipIntegrityError('Informe uma chave de tipo com até 64 caracteres.');
    const name = normalizedText(input.name, 80);
    if (!name) throw new RelationshipIntegrityError('Informe o nome do tipo de relacionamento.');
    const duplicate = await prisma.relationshipType.findFirst({ where: { campaignId, key } });
    if (duplicate) throw new RelationshipIntegrityError('Já existe um tipo personalizado com essa chave.');
    return prisma.relationshipType.create({ data: { campaignId, key, name, description: normalizedText(input.description, 500), directional: input.directional ?? true, color: normalizedText(input.color, 32), icon: normalizedText(input.icon, 48) } });
  },

  async create(input: CreateRelationshipInput) {
    const { from, to } = await assertFilePair(input.fromId, input.toId);
    const type = await resolveType(from.campaignId, input);
    const endpoints = normalizedEndpoints(from.id, to.id, type.directional);
    const duplicate = await prisma.relationship.findFirst({ where: duplicateWhere(from.campaignId, endpoints.fromId, endpoints.toId, type.id, type.directional) });
    if (duplicate) throw relationshipDuplicateConflict();
    let relationship;
    try {
      relationship = await prisma.relationship.create({
        data: {
          campaignId: from.campaignId,
          fromId: endpoints.fromId,
          toId: endpoints.toId,
          typeId: type.id,
          kind: legacyKindForType(type.key),
          label: normalizedText(input.label, 120),
          description: normalizedText(input.description, 2000),
          importance: input.importance ?? 'NORMAL',
          visibility: input.visibility ?? 'GM'
        },
        include: relationshipInclude()
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) throw relationshipDuplicateConflict();
      throw error;
    }
    await Promise.all([
      logHistory(from.id, 'relationship_added', `Relacionado a "${relationship.to.name}" por ${relationship.type.name}`),
      logHistory(to.id, 'relationship_added', `Recebeu relação de "${relationship.from.name}" por ${relationship.type.name}`)
    ]);
    return relationship;
  },

  async update(id: string, input: UpdateRelationshipInput) {
    const existing = await prisma.relationship.findUnique({ where: { id }, include: relationshipInclude() });
    if (!existing) throw new RelationshipIntegrityError('Relacionamento não encontrado.', 404);
    await assertCampaignAccess(existing.campaignId, { write: true });
    const type = input.typeId || input.typeKey || input.kind ? await resolveType(existing.campaignId, input) : existing.type;
    const endpoints = normalizedEndpoints(existing.fromId, existing.toId, type.directional);
    const duplicate = await prisma.relationship.findFirst({ where: duplicateWhere(existing.campaignId, endpoints.fromId, endpoints.toId, type.id, type.directional, id) });
    if (duplicate) throw relationshipDuplicateConflict();
    let updated;
    try {
      updated = await prisma.relationship.update({
        where: { id },
        data: {
          fromId: endpoints.fromId,
          toId: endpoints.toId,
          typeId: type.id,
          kind: legacyKindForType(type.key),
          ...(input.label !== undefined ? { label: normalizedText(input.label, 120) } : {}),
          ...(input.description !== undefined ? { description: normalizedText(input.description, 2000) } : {}),
          ...(input.importance !== undefined ? { importance: input.importance } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {})
        },
        include: relationshipInclude()
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) throw relationshipDuplicateConflict();
      throw error;
    }
    await Promise.all([
      logHistory(existing.fromId, 'edited', `Relacionamento com "${existing.to.name}" atualizado`),
      logHistory(existing.toId, 'edited', `Relacionamento com "${existing.from.name}" atualizado`)
    ]);
    return updated;
  },

  async remove(id: string) {
    const relationship = await prisma.relationship.findUnique({ where: { id }, include: relationshipInclude() });
    if (!relationship) throw new RelationshipIntegrityError('Relacionamento não encontrado.', 404);
    await assertCampaignAccess(relationship.campaignId, { write: true });
    await prisma.relationship.delete({ where: { id } });
    await Promise.all([
      logHistory(relationship.fromId, 'relationship_removed', `Removido de "${relationship.to.name}"`),
      logHistory(relationship.toId, 'relationship_removed', `Removido de "${relationship.from.name}"`)
    ]);
    return relationship;
  },

  async get(id: string) {
    const relationship = await prisma.relationship.findUnique({ where: { id }, include: relationshipInclude() });
    if (!relationship) throw relationshipNotFound();
    const viewer = await getRelationshipViewer(relationship.campaignId);
    const fileIds = await accessibleFileIds(viewer);
    const allowedAudiences = visibleRelationshipAudiences(relationshipViewer(viewer));
    if ((allowedAudiences && !allowedAudiences.includes(relationship.visibility)) || (fileIds && (!fileIds.includes(relationship.fromId) || !fileIds.includes(relationship.toId)))) throw relationshipNotFound();
    return relationship;
  },

  async getForEntity(fileId: string) {
    const file = await prisma.campaignFile.findUnique({ where: { id: fileId }, select: { id: true, campaignId: true } });
    if (!file) throw new RelationshipIntegrityError('Arquivo não encontrado.', 404);
    const viewer = await getRelationshipViewer(file.campaignId);
    const fileIds = await accessibleFileIds(viewer);
    if (fileIds && !fileIds.includes(file.id)) throw new RelationshipIntegrityError('Arquivo não encontrado.', 404);
    const visible = visibleRelationshipWhere(file.campaignId, viewer, fileIds);
    const [outgoing, incoming] = await Promise.all([
      prisma.relationship.findMany({ where: { ...visible, fromId: fileId }, include: relationshipInclude(), orderBy: { createdAt: 'desc' } }),
      prisma.relationship.findMany({ where: { ...visible, toId: fileId }, include: relationshipInclude(), orderBy: { createdAt: 'desc' } })
    ]);
    return { outgoing, incoming };
  },

  async getGraph(campaignId: string, requestedFileIds?: string[]) {
    const viewer = await getRelationshipViewer(campaignId);
    const requested = requestedFileIds === undefined ? null : [...new Set(requestedFileIds)];
    const accessible = await accessibleFileIds(viewer);
    const fileIds = requested === null ? accessible : accessible === null ? requested : requested.filter((fileId) => accessible.includes(fileId));
    const files = await prisma.campaignFile.findMany({
      where: {
        campaignId,
        isArchived: false,
        isTrashed: false,
        ...(fileIds !== null ? { id: { in: fileIds } } : {})
      },
      select: { id: true, name: true, type: true }
    });
    const activeFileIds = files.map((file) => file.id);
    const relationships = activeFileIds.length === 0
      ? []
      : await prisma.relationship.findMany({ where: visibleRelationshipWhere(campaignId, viewer, activeFileIds), include: relationshipInclude(), orderBy: { createdAt: 'asc' } });
    return {
      nodes: files,
      edges: relationships.map((relationship) => ({ id: relationship.id, sourceId: relationship.fromId, targetId: relationship.toId, type: relationship.type, label: relationship.label, description: relationship.description, importance: relationship.importance, visibility: relationship.visibility }))
    };
  },

  async listForPlayer(campaignId: string, accessibleFileIds: string[]) {
    const viewer = await getRelationshipViewer(campaignId);
    const verifiedFileIds = await accessibleFileIdsForViewer(viewer, accessibleFileIds);
    if (verifiedFileIds.length === 0) return [];
    return prisma.relationship.findMany({
      where: visibleRelationshipWhere(campaignId, viewer, verifiedFileIds),
      include: relationshipInclude(),
      orderBy: { createdAt: 'asc' }
    });
  },

  async listForPublic(campaignId: string, accessibleFileIds: string[]) {
    const viewer = await getPublicViewerContext(campaignId);
    const verifiedFileIds = await accessiblePublicFileIds(viewer, accessibleFileIds);
    if (verifiedFileIds.length === 0) return [];
    return prisma.relationship.findMany({
      where: visibleRelationshipWhere(campaignId, viewer, verifiedFileIds),
      include: relationshipInclude(),
      orderBy: { createdAt: 'asc' }
    });
  }
};
