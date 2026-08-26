import { Prisma } from '@prisma/client';
import { assertCampaignRole } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import type {
  InvestigationBoardViewFilters,
  InvestigationBoardViewItem,
  InvestigationBoardViewKind,
  InvestigationBoardViewSnapshot
} from '@/types';

const MAX_NAME = 120;
const MAX_DESCRIPTION = 1000;
const MAX_SNAPSHOT_BYTES = 20_000;
const MAX_COORDINATE = 100000;
const VIEW_KINDS = new Set<InvestigationBoardViewKind>(['SESSION', 'CASE', 'ARC']);
const FILE_TYPES = new Set(['ALL', 'CAMPAIGN', 'NPC', 'CHARACTER', 'THREAT', 'PUZZLE', 'DOCUMENT', 'CLUE', 'OBJECT', 'EVENT', 'SESSION', 'MAP', 'IMAGE', 'AUDIO', 'VIDEO', 'NOTE', 'LOCATION']);
const IMPORTANCES = new Set(['ALL', 'CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL']);
const VISIBILITIES = new Set(['ALL', 'GM', 'P1', 'P2', 'P3', 'P4']);
const STATUSES = new Set(['ALL', 'OPEN', 'SUPPORTED', 'REFUTED', 'RESOLVED']);
const STANCES = new Set(['ALL', 'SUPPORTS', 'CONTRADICTS', 'CONTEXT']);
const LAYERS = ['files', 'officialRelationships', 'visualEdges', 'evidence', 'hypotheses', 'annotations'] as const;

type JsonRecord = Record<string, unknown>;

export class BoardViewIntegrityError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'BoardViewIntegrityError';
    this.status = status;
  }
}

function record(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: string, field: string, max: number) {
  const normalized = value.trim();
  if (!normalized) throw new BoardViewIntegrityError(`${field} é obrigatório.`);
  if (normalized.length > max) throw new BoardViewIntegrityError(`${field} pode ter no máximo ${max} caracteres.`);
  return normalized;
}

function optionalDescription(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim() === '') return null;
  return text(value, 'A descrição da vista', MAX_DESCRIPTION);
}

function finite(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new BoardViewIntegrityError(`${field} está fora do intervalo permitido.`);
  return value;
}

function uniqueIds(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) throw new BoardViewIntegrityError(`${field} deve ser uma lista de IDs.`);
  const ids = value.map((item) => item.trim());
  if (new Set(ids).size !== ids.length) throw new BoardViewIntegrityError(`${field} não pode conter IDs duplicados.`);
  return ids;
}

function validateFilters(filters: unknown): InvestigationBoardViewFilters {
  if (!record(filters)) throw new BoardViewIntegrityError('Os filtros da vista são obrigatórios.');
  if (typeof filters.search !== 'string' || filters.search.length > 200) throw new BoardViewIntegrityError('A busca da vista é inválida ou muito longa.');
  if (typeof filters.fileType !== 'string' || !FILE_TYPES.has(filters.fileType)) throw new BoardViewIntegrityError('O tipo de ficha da vista é inválido.');
  const tagIds = uniqueIds(filters.tagIds, 'As tags da vista');
  if (typeof filters.scope !== 'string' || !new Set(['active', 'archived', 'trash']).has(filters.scope)) throw new BoardViewIntegrityError('O escopo da vista é inválido.');
  if (typeof filters.favoritesOnly !== 'boolean') throw new BoardViewIntegrityError('O filtro de favoritas da vista é inválido.');
  if (typeof filters.relationshipImportance !== 'string' || !IMPORTANCES.has(filters.relationshipImportance)) throw new BoardViewIntegrityError('A importância de relações da vista é inválida.');
  if (typeof filters.relationshipVisibility !== 'string' || !VISIBILITIES.has(filters.relationshipVisibility)) throw new BoardViewIntegrityError('A visibilidade de relações da vista é inválida.');
  if (typeof filters.hypothesisStatus !== 'string' || !STATUSES.has(filters.hypothesisStatus)) throw new BoardViewIntegrityError('O estado de hipóteses da vista é inválido.');
  if (typeof filters.evidenceStance !== 'string' || !STANCES.has(filters.evidenceStance)) throw new BoardViewIntegrityError('A posição de evidência da vista é inválida.');
  if (!record(filters.layers)) throw new BoardViewIntegrityError('As camadas da vista são obrigatórias.');
  const layers = {} as InvestigationBoardViewFilters['layers'];
  for (const key of LAYERS) {
    if (typeof filters.layers[key] !== 'boolean') throw new BoardViewIntegrityError(`A camada ${key} da vista é inválida.`);
    layers[key] = filters.layers[key] as boolean;
  }
  return {
    search: filters.search,
    fileType: filters.fileType as InvestigationBoardViewFilters['fileType'],
    tagIds,
    scope: filters.scope as InvestigationBoardViewFilters['scope'],
    favoritesOnly: filters.favoritesOnly,
    relationshipImportance: filters.relationshipImportance as InvestigationBoardViewFilters['relationshipImportance'],
    relationshipVisibility: filters.relationshipVisibility as InvestigationBoardViewFilters['relationshipVisibility'],
    hypothesisStatus: filters.hypothesisStatus as InvestigationBoardViewFilters['hypothesisStatus'],
    evidenceStance: filters.evidenceStance as InvestigationBoardViewFilters['evidenceStance'],
    layers
  };
}

export function validateBoardViewSnapshot(input: unknown): InvestigationBoardViewSnapshot {
  if (!record(input)) throw new BoardViewIntegrityError('O snapshot da vista é obrigatório.');
  const pan = record(input.pan) ? input.pan : {};
  const snapshot: InvestigationBoardViewSnapshot = {
    pan: { x: finite(pan.x, 'A posição horizontal da vista', -MAX_COORDINATE, MAX_COORDINATE), y: finite(pan.y, 'A posição vertical da vista', -MAX_COORDINATE, MAX_COORDINATE) },
    zoom: finite(input.zoom, 'O zoom da vista', 0.3, 2),
    filters: validateFilters(input.filters),
    pinIds: uniqueIds(input.pinIds, 'Os pins da vista'),
    groupIds: uniqueIds(input.groupIds, 'Os grupos da vista')
  };
  if (JSON.stringify(snapshot).length > MAX_SNAPSHOT_BYTES) throw new BoardViewIntegrityError('O snapshot da vista excede o limite de tamanho.');
  return snapshot;
}

async function assertOwner(campaignId: string) {
  return assertCampaignRole(campaignId, 'OWNER');
}

async function assertAnnotations(campaignId: string, snapshot: InvestigationBoardViewSnapshot) {
  const [pins, groups] = await Promise.all([
    prisma.investigationBoardPin.findMany({ where: { campaignId, id: { in: snapshot.pinIds } }, select: { id: true } }),
    prisma.investigationBoardGroup.findMany({ where: { campaignId, id: { in: snapshot.groupIds } }, select: { id: true } })
  ]);
  if (pins.length !== snapshot.pinIds.length || groups.length !== snapshot.groupIds.length) throw new BoardViewIntegrityError('A vista referencia uma anotação que não pertence à campanha.', 404);
}

function sanitizeSnapshot(snapshot: unknown, pinIds: Set<string>, groupIds: Set<string>) {
  const parsed = validateBoardViewSnapshot(snapshot);
  const validPins = parsed.pinIds.filter((id) => pinIds.has(id));
  const validGroups = parsed.groupIds.filter((id) => groupIds.has(id));
  return { snapshot: { ...parsed, pinIds: validPins, groupIds: validGroups }, omitted: validPins.length !== parsed.pinIds.length || validGroups.length !== parsed.groupIds.length };
}

function serializeView(view: { id: string; campaignId: string; name: string; kind: InvestigationBoardViewKind; description: string | null; order: number; snapshot: Prisma.JsonValue; createdAt: Date; updatedAt: Date }, pinIds: Set<string>, groupIds: Set<string>): { item: InvestigationBoardViewItem; omitted: boolean } {
  const sanitized = sanitizeSnapshot(view.snapshot, pinIds, groupIds);
  return {
    item: { id: view.id, campaignId: view.campaignId, name: view.name, kind: view.kind, description: view.description, order: view.order, snapshot: sanitized.snapshot, createdAt: view.createdAt.toISOString(), updatedAt: view.updatedAt.toISOString() },
    omitted: sanitized.omitted
  };
}

export const boardViewService = {
  async list(campaignId: string) {
    await assertOwner(campaignId);
    const [views, pins, groups] = await Promise.all([
      prisma.investigationBoardView.findMany({ where: { campaignId }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      prisma.investigationBoardPin.findMany({ where: { campaignId }, select: { id: true } }),
      prisma.investigationBoardGroup.findMany({ where: { campaignId }, select: { id: true } })
    ]);
    const pinIds = new Set(pins.map((pin) => pin.id));
    const groupIds = new Set(groups.map((group) => group.id));
    const serialized = views.map((view) => serializeView(view, pinIds, groupIds));
    return { views: serialized.map(({ item }) => item), warnings: serialized.some(({ omitted }) => omitted) ? ['Uma ou mais referências ausentes foram omitidas ao carregar as vistas.'] : [] };
  },

  async create(campaignId: string, input: { name: string; kind: InvestigationBoardViewKind; description?: string | null; order?: number; snapshot: unknown }) {
    await assertOwner(campaignId);
    if (!VIEW_KINDS.has(input.kind)) throw new BoardViewIntegrityError('O tipo da vista é inválido.');
    const snapshot = validateBoardViewSnapshot(input.snapshot);
    await assertAnnotations(campaignId, snapshot);
    const order = input.order === undefined ? await prisma.investigationBoardView.count({ where: { campaignId } }) : Math.max(0, Math.floor(finite(input.order, 'A ordem da vista', 0, 100000)));
    const view = await prisma.investigationBoardView.create({ data: { campaignId, name: text(input.name, 'O nome da vista', MAX_NAME), kind: input.kind, description: optionalDescription(input.description), order, snapshot: snapshot as unknown as Prisma.InputJsonValue } });
    return serializeView(view, new Set(snapshot.pinIds), new Set(snapshot.groupIds)).item;
  },

  async update(id: string, input: { name?: string; kind?: InvestigationBoardViewKind; description?: string | null; order?: number; snapshot?: unknown }) {
    const existing = await prisma.investigationBoardView.findUnique({ where: { id } });
    if (!existing) throw new BoardViewIntegrityError('Vista não encontrada.', 404);
    await assertOwner(existing.campaignId);
    const snapshot = input.snapshot === undefined ? validateBoardViewSnapshot(existing.snapshot) : validateBoardViewSnapshot(input.snapshot);
    await assertAnnotations(existing.campaignId, snapshot);
    if (input.kind !== undefined && !VIEW_KINDS.has(input.kind)) throw new BoardViewIntegrityError('O tipo da vista é inválido.');
    const view = await prisma.investigationBoardView.update({ where: { id }, data: { ...(input.name === undefined ? {} : { name: text(input.name, 'O nome da vista', MAX_NAME) }), ...(input.kind === undefined ? {} : { kind: input.kind }), ...(input.description === undefined ? {} : { description: optionalDescription(input.description) }), ...(input.order === undefined ? {} : { order: Math.max(0, Math.floor(finite(input.order, 'A ordem da vista', 0, 100000))) }), ...(input.snapshot === undefined ? {} : { snapshot: snapshot as unknown as Prisma.InputJsonValue }) } });
    return serializeView(view, new Set(snapshot.pinIds), new Set(snapshot.groupIds)).item;
  },

  async remove(id: string) {
    const existing = await prisma.investigationBoardView.findUnique({ where: { id }, select: { campaignId: true } });
    if (!existing) throw new BoardViewIntegrityError('Vista não encontrada.', 404);
    await assertOwner(existing.campaignId);
    await prisma.investigationBoardView.delete({ where: { id } });
  },

  async reorder(campaignId: string, viewIds: string[]) {
    await assertOwner(campaignId);
    const ids = uniqueIds(viewIds, 'As vistas');
    const existing = await prisma.investigationBoardView.findMany({ where: { campaignId }, select: { id: true } });
    if (existing.length !== ids.length || existing.some((view) => !ids.includes(view.id))) throw new BoardViewIntegrityError('A ordenação precisa conter exatamente as vistas da campanha.');
    await prisma.$transaction(ids.map((id, order) => prisma.investigationBoardView.update({ where: { id }, data: { order } })));
    return this.list(campaignId);
  }
};
