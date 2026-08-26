import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { assertCampaignRole, assertOwnedCampaignForWrite } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ChecklistItem, SessionPlanItem, SessionPlanning, SessionPlanningStatus } from '@/types';

const MAX_NAME = 160;
const MAX_DESCRIPTION = 4000;
const MAX_SUMMARY = 20000;
const MAX_ITEMS = 80;
const MAX_OBJECTIVES = 20;
const MAX_AGENDA = 20;
const MAX_LINKS = 100;
const MAX_LABEL = 240;
const MAX_ITEM_ID = 80;
const MAX_ORDER = 100000;

const SESSION_STATUSES: SessionPlanningStatus[] = ['PLANNED', 'COMPLETED'];

export class SessionPlanningIntegrityError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'SessionPlanningIntegrityError';
    this.status = status;
  }
}

type PlanItem = ChecklistItem | SessionPlanItem;
type LinkInput = { fileIds?: string[]; hypothesisIds?: string[]; viewIds?: string[] };
type SessionInput = {
  name: string;
  date?: string | null;
  summary?: string | null;
  checklist?: unknown;
  objectives?: unknown;
  agenda?: unknown;
  postSummary?: string | null;
  status?: SessionPlanningStatus;
  order?: number;
} & LinkInput;

type SessionWithPlanning = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

type Tx = Prisma.TransactionClient;

const sessionInclude = {
  files: { orderBy: { file: { name: 'asc' as const } }, include: { file: { select: { id: true, name: true, type: true } } } },
  hypothesisLinks: { orderBy: { hypothesis: { title: 'asc' as const } }, include: { hypothesis: { select: { id: true, title: true, status: true } } } },
  boardViewLinks: { orderBy: { view: { order: 'asc' as const } }, include: { view: { select: { id: true, name: true, kind: true } } } }
} satisfies Prisma.SessionInclude;

function text(value: string, field: string, max: number) {
  const normalized = value.trim();
  if (!normalized) throw new SessionPlanningIntegrityError(`${field} é obrigatório.`);
  if (normalized.length > max) throw new SessionPlanningIntegrityError(`${field} pode ter no máximo ${max} caracteres.`);
  return normalized;
}

function optionalText(value: string | null | undefined, field: string, max: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim();
  if (normalized.length > max) throw new SessionPlanningIntegrityError(`${field} pode ter no máximo ${max} caracteres.`);
  return normalized || null;
}

function id(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return randomUUID();
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > MAX_ITEM_ID) throw new SessionPlanningIntegrityError(`${field} possui identificador inválido.`);
  return value.trim();
}

function normalizeItems(value: unknown, field: string, maxItems: number): PlanItem[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new SessionPlanningIntegrityError(`${field} deve ser uma lista.`);
  if (value.length > maxItems) throw new SessionPlanningIntegrityError(`${field} pode conter no máximo ${maxItems} itens.`);
  const itemIds = new Set<string>();
  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new SessionPlanningIntegrityError(`${field}[${index}] deve ser um objeto.`);
    const record = item as { id?: unknown; label?: unknown; done?: unknown };
    const itemId = id(record.id, `${field}[${index}].id`);
    if (itemIds.has(itemId)) throw new SessionPlanningIntegrityError(`${field} não pode conter IDs duplicados.`);
    itemIds.add(itemId);
    if (typeof record.label !== 'string') throw new SessionPlanningIntegrityError(`${field}[${index}].label é obrigatório.`);
    return { id: itemId, label: text(record.label, `${field}[${index}].label`, MAX_LABEL), done: record.done === true };
  });
}

function uniqueIds(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new SessionPlanningIntegrityError(`${field} deve ser uma lista.`);
  if (value.length > MAX_LINKS) throw new SessionPlanningIntegrityError(`${field} pode conter no máximo ${MAX_LINKS} referências.`);
  const ids = value.map((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) throw new SessionPlanningIntegrityError(`${field}[${index}] possui uma referência inválida.`);
    return entry.trim();
  });
  if (new Set(ids).size !== ids.length) throw new SessionPlanningIntegrityError(`${field} não pode conter referências duplicadas.`);
  return ids;
}

function date(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new SessionPlanningIntegrityError('A data da sessão é inválida.');
  return parsed;
}

function status(value: SessionPlanningStatus | undefined) {
  if (value === undefined) return undefined;
  if (!SESSION_STATUSES.includes(value)) throw new SessionPlanningIntegrityError('O estado do planejamento é inválido.');
  return value;
}

function order(value: number | undefined) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0 || value > MAX_ORDER) throw new SessionPlanningIntegrityError('A ordem da sessão está fora do limite permitido.');
  return value;
}

function normalizedInput(input: SessionInput, options: { partial?: boolean } = {}) {
  const partial = options.partial === true;
  return {
    name: partial && input.name === undefined ? undefined : text(input.name, 'O nome da sessão', MAX_NAME),
    date: date(input.date),
    summary: optionalText(input.summary, 'O resumo', MAX_DESCRIPTION),
    checklist: input.checklist === undefined && partial ? undefined : normalizeItems(input.checklist, 'O checklist', MAX_ITEMS),
    objectives: input.objectives === undefined && partial ? undefined : normalizeItems(input.objectives, 'Os objetivos', MAX_OBJECTIVES),
    agenda: input.agenda === undefined && partial ? undefined : normalizeItems(input.agenda, 'O roteiro', MAX_AGENDA),
    postSummary: optionalText(input.postSummary, 'O resumo pós-sessão', MAX_SUMMARY),
    status: status(input.status),
    order: order(input.order),
    fileIds: uniqueIds(input.fileIds, 'fileIds'),
    hypothesisIds: uniqueIds(input.hypothesisIds, 'hypothesisIds'),
    viewIds: uniqueIds(input.viewIds, 'viewIds')
  };
}

async function assertLinks(campaignId: string, links: LinkInput, tx: Tx) {
  if (links.fileIds !== undefined) {
    const files = await tx.campaignFile.findMany({ where: { campaignId, id: { in: links.fileIds }, isTrashed: false }, select: { id: true } });
    if (files.length !== links.fileIds.length) throw new SessionPlanningIntegrityError('Uma ou mais fichas não pertencem à campanha ou estão na lixeira.', 422);
  }
  if (links.hypothesisIds !== undefined) {
    const hypotheses = await tx.investigationHypothesis.findMany({ where: { campaignId, id: { in: links.hypothesisIds } }, select: { id: true } });
    if (hypotheses.length !== links.hypothesisIds.length) throw new SessionPlanningIntegrityError('Uma ou mais hipóteses não pertencem à campanha informada.', 422);
  }
  if (links.viewIds !== undefined) {
    const views = await tx.investigationBoardView.findMany({ where: { campaignId, id: { in: links.viewIds } }, select: { id: true } });
    if (views.length !== links.viewIds.length) throw new SessionPlanningIntegrityError('Uma ou mais vistas não pertencem à campanha informada.', 422);
  }
}

async function syncLinks(sessionId: string, campaignId: string, links: LinkInput, tx: Tx) {
  await assertLinks(campaignId, links, tx);
  if (links.fileIds !== undefined) {
    await tx.sessionFile.deleteMany({ where: { sessionId } });
    if (links.fileIds.length > 0) await tx.sessionFile.createMany({ data: links.fileIds.map((fileId) => ({ sessionId, fileId })) });
  }
  if (links.hypothesisIds !== undefined) {
    await tx.sessionHypothesis.deleteMany({ where: { sessionId } });
    if (links.hypothesisIds.length > 0) await tx.sessionHypothesis.createMany({ data: links.hypothesisIds.map((hypothesisId) => ({ sessionId, hypothesisId })) });
  }
  if (links.viewIds !== undefined) {
    await tx.sessionBoardView.deleteMany({ where: { sessionId } });
    if (links.viewIds.length > 0) await tx.sessionBoardView.createMany({ data: links.viewIds.map((viewId) => ({ sessionId, viewId })) });
  }
}

function storedItems(value: unknown, field: string, maxItems: number) {
  return normalizeItems(value, field, maxItems);
}

function serialize(session: SessionWithPlanning): SessionPlanning {
  return {
    id: session.id,
    campaignId: session.campaignId,
    name: session.name,
    date: session.date?.toISOString() ?? null,
    summary: session.summary,
    checklist: storedItems(session.checklist, 'O checklist', MAX_ITEMS) as ChecklistItem[],
    objectives: storedItems(session.objectives, 'Os objetivos', MAX_OBJECTIVES) as SessionPlanItem[],
    agenda: storedItems(session.agenda, 'O roteiro', MAX_AGENDA) as SessionPlanItem[],
    postSummary: session.postSummary,
    status: session.status,
    completedAt: session.completedAt?.toISOString() ?? null,
    order: session.order,
    files: session.files.map((link) => link.file),
    hypotheses: session.hypothesisLinks.map((link) => link.hypothesis),
    views: session.boardViewLinks.map((link) => link.view)
  };
}

async function load(campaignId: string, sessionId: string, write = false) {
  if (write) await assertOwnedCampaignForWrite(campaignId);
  else await assertCampaignRole(campaignId, 'OWNER');
  const session = await prisma.session.findFirst({ where: { id: sessionId, campaignId }, include: sessionInclude });
  if (!session) throw new SessionPlanningIntegrityError('Planejamento de sessão não encontrado.', 404);
  return session as SessionWithPlanning;
}

export const sessionPlanningService = {
  async list(campaignId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    const sessions = await prisma.session.findMany({ where: { campaignId }, orderBy: [{ order: 'asc' }, { id: 'asc' }], include: sessionInclude });
    return sessions.map((session) => serialize(session as SessionWithPlanning));
  },

  async get(campaignId: string, sessionId: string) {
    return serialize(await load(campaignId, sessionId));
  },

  async getById(sessionId: string) {
    const user = await requireUser();
    const session = await prisma.session.findFirst({ where: { id: sessionId, campaign: { ownerId: user.id } }, include: sessionInclude });
    if (!session) throw new SessionPlanningIntegrityError('Planejamento de sessão não encontrado.', 404);
    return serialize(session as SessionWithPlanning);
  },

  async create(campaignId: string, input: SessionInput) {
    await assertOwnedCampaignForWrite(campaignId);
    const normalized = normalizedInput(input);
    const created = await prisma.$transaction(async (tx) => {
      await assertLinks(campaignId, normalized, tx);
      const latest = normalized.order === undefined ? await tx.session.findFirst({ where: { campaignId }, orderBy: { order: 'desc' }, select: { order: true } }) : null;
      const session = await tx.session.create({
        data: {
          campaignId,
          name: normalized.name!,
          date: normalized.date ?? null,
          summary: normalized.summary ?? null,
          checklist: normalized.checklist as unknown as Prisma.InputJsonValue,
          objectives: normalized.objectives as unknown as Prisma.InputJsonValue,
          agenda: normalized.agenda as unknown as Prisma.InputJsonValue,
          postSummary: normalized.postSummary ?? null,
          status: normalized.status ?? 'PLANNED',
          completedAt: normalized.status === 'COMPLETED' ? new Date() : null,
          order: normalized.order ?? ((latest?.order ?? -1) + 1)
        }
      });
      await syncLinks(session.id, campaignId, normalized, tx);
      return tx.session.findUnique({ where: { id: session.id }, include: sessionInclude });
    });
    if (!created) throw new SessionPlanningIntegrityError('O planejamento não pôde ser criado.', 500);
    return serialize(created as SessionWithPlanning);
  },

  async update(campaignId: string, sessionId: string, input: Partial<SessionInput>) {
    await load(campaignId, sessionId, true);
    const normalized = normalizedInput(input as SessionInput, { partial: true });
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.session.findFirst({ where: { id: sessionId, campaignId }, select: { status: true, completedAt: true } });
      if (!existing) throw new SessionPlanningIntegrityError('Planejamento de sessão não encontrado.', 404);
      await assertLinks(campaignId, normalized, tx);
      const nextStatus = normalized.status ?? existing.status;
      const completedAt = nextStatus === 'COMPLETED' ? existing.completedAt ?? new Date() : null;
      const session = await tx.session.update({
        where: { id: sessionId },
        data: {
          name: normalized.name,
          date: normalized.date,
          summary: normalized.summary,
          checklist: normalized.checklist as unknown as Prisma.InputJsonValue | undefined,
          objectives: normalized.objectives as unknown as Prisma.InputJsonValue | undefined,
          agenda: normalized.agenda as unknown as Prisma.InputJsonValue | undefined,
          postSummary: normalized.postSummary,
          status: nextStatus,
          completedAt,
          order: normalized.order
        }
      });
      await syncLinks(sessionId, campaignId, normalized, tx);
      return tx.session.findUnique({ where: { id: session.id }, include: sessionInclude });
    });
    if (!updated) throw new SessionPlanningIntegrityError('O planejamento não pôde ser atualizado.', 500);
    return serialize(updated as SessionWithPlanning);
  },

  async remove(campaignId: string, sessionId: string) {
    await load(campaignId, sessionId, true);
    await prisma.session.delete({ where: { id: sessionId } });
  },

  async updateFromId(sessionId: string, input: Partial<SessionInput>) {
    const user = await requireUser();
    const existing = await prisma.session.findFirst({ where: { id: sessionId, campaign: { ownerId: user.id } }, select: { campaignId: true } });
    if (!existing) throw new SessionPlanningIntegrityError('Planejamento de sessão não encontrado.', 404);
    return this.update(existing.campaignId, sessionId, input);
  },

  async removeFromId(sessionId: string) {
    const user = await requireUser();
    const existing = await prisma.session.findFirst({ where: { id: sessionId, campaign: { ownerId: user.id } }, select: { campaignId: true } });
    if (!existing) throw new SessionPlanningIntegrityError('Planejamento de sessão não encontrado.', 404);
    return this.remove(existing.campaignId, sessionId);
  }
};
