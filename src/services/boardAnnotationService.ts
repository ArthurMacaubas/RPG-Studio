import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { assertCampaignRole } from '@/lib/access';
import type { InvestigationBoardGroup, InvestigationBoardGroupItem, InvestigationBoardPinItem } from '@/types';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_PIN_TEXT = 280;
const MAX_GROUP_NAME = 120;
const MIN_GROUP_SIZE = 80;
const MAX_GROUP_SIZE = 5000;
const MAX_COORDINATE = 100000;

export class BoardAnnotationIntegrityError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'BoardAnnotationIntegrityError';
    this.status = status;
  }
}

function text(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized) throw new BoardAnnotationIntegrityError(`${field} é obrigatório.`);
  if (normalized.length > maxLength) throw new BoardAnnotationIntegrityError(`${field} pode ter no máximo ${maxLength} caracteres.`);
  return normalized;
}

function color(value: string | undefined) {
  const normalized = value?.trim() || '#E5AC68';
  if (!HEX_COLOR.test(normalized)) throw new BoardAnnotationIntegrityError('A cor precisa estar no formato hexadecimal #RRGGBB.');
  return normalized.toUpperCase();
}

function coordinate(value: number, field: string) {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_COORDINATE) throw new BoardAnnotationIntegrityError(`${field} está fora do intervalo permitido.`);
  return value;
}

function size(value: number | undefined, field: string, fallback: number) {
  const next = value ?? fallback;
  if (!Number.isFinite(next) || next < MIN_GROUP_SIZE || next > MAX_GROUP_SIZE) throw new BoardAnnotationIntegrityError(`${field} precisa estar entre ${MIN_GROUP_SIZE} e ${MAX_GROUP_SIZE}.`);
  return next;
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function assertOwner(campaignId: string) {
  return assertCampaignRole(campaignId, 'OWNER');
}

async function assertNodes(campaignId: string, boardNodeIds: string[]) {
  const ids = uniqueIds(boardNodeIds);
  if (ids.length === 0) return ids;
  const nodes = await prisma.boardNode.findMany({ where: { campaignId, id: { in: ids } }, select: { id: true } });
  if (nodes.length !== ids.length) throw new BoardAnnotationIntegrityError('Um ou mais nós não pertencem à campanha informada.', 404);
  return ids;
}

function serializePin(pin: { id: string; campaignId: string; text: string; x: number; y: number; color: string; createdAt: Date; updatedAt: Date }): InvestigationBoardPinItem {
  return { id: pin.id, campaignId: pin.campaignId, text: pin.text, x: pin.x, y: pin.y, color: pin.color, createdAt: pin.createdAt.toISOString(), updatedAt: pin.updatedAt.toISOString() };
}

function serializeGroup(group: {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{ groupId: string; boardNodeId: string; boardNode: { fileId: string } }>;
}): InvestigationBoardGroup {
  const items: InvestigationBoardGroupItem[] = group.items.map((item) => ({ groupId: item.groupId, boardNodeId: item.boardNodeId, fileId: item.boardNode.fileId }));
  return { id: group.id, campaignId: group.campaignId, name: group.name, color: group.color, x: group.x, y: group.y, width: group.width, height: group.height, items, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() };
}

const groupInclude = { items: { orderBy: { createdAt: 'asc' as const }, include: { boardNode: { select: { fileId: true } } } } };

type GroupWithItems = Prisma.InvestigationBoardGroupGetPayload<{ include: typeof groupInclude }>;

function requireGroup(group: GroupWithItems | null): GroupWithItems {
  if (!group) throw new BoardAnnotationIntegrityError('Agrupamento visual não encontrado.', 404);
  return group;
}

export const boardAnnotationService = {
  async list(campaignId: string) {
    await assertOwner(campaignId);
    const [pins, groups] = await Promise.all([
      prisma.investigationBoardPin.findMany({ where: { campaignId }, orderBy: { createdAt: 'asc' } }),
      prisma.investigationBoardGroup.findMany({ where: { campaignId }, orderBy: { createdAt: 'asc' }, include: groupInclude })
    ]);
    return { pins: pins.map(serializePin), groups: groups.map(serializeGroup) };
  },

  async createPin(campaignId: string, input: { text: string; x: number; y: number; color?: string }) {
    await assertOwner(campaignId);
    const pin = await prisma.investigationBoardPin.create({ data: { campaignId, text: text(input.text, 'O texto do pin', MAX_PIN_TEXT), x: coordinate(input.x, 'A posição X'), y: coordinate(input.y, 'A posição Y'), color: color(input.color) } });
    return serializePin(pin);
  },

  async updatePin(id: string, input: { text?: string; x?: number; y?: number; color?: string }) {
    const existing = await prisma.investigationBoardPin.findUnique({ where: { id } });
    if (!existing) throw new BoardAnnotationIntegrityError('Pin não encontrado.', 404);
    await assertOwner(existing.campaignId);
    const pin = await prisma.investigationBoardPin.update({ where: { id }, data: { ...(input.text === undefined ? {} : { text: text(input.text, 'O texto do pin', MAX_PIN_TEXT) }), ...(input.x === undefined ? {} : { x: coordinate(input.x, 'A posição X') }), ...(input.y === undefined ? {} : { y: coordinate(input.y, 'A posição Y') }), ...(input.color === undefined ? {} : { color: color(input.color) }) } });
    return serializePin(pin);
  },

  async removePin(id: string) {
    const existing = await prisma.investigationBoardPin.findUnique({ where: { id } });
    if (!existing) throw new BoardAnnotationIntegrityError('Pin não encontrado.', 404);
    await assertOwner(existing.campaignId);
    await prisma.investigationBoardPin.delete({ where: { id } });
  },

  async createGroup(campaignId: string, input: { name: string; color?: string; x: number; y: number; width?: number; height?: number; boardNodeIds?: string[] }) {
    await assertOwner(campaignId);
    const boardNodeIds = await assertNodes(campaignId, input.boardNodeIds ?? []);
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.investigationBoardGroup.create({ data: { campaignId, name: text(input.name, 'O nome do grupo', MAX_GROUP_NAME), color: color(input.color), x: coordinate(input.x, 'A posição X'), y: coordinate(input.y, 'A posição Y'), width: size(input.width, 'A largura', 320), height: size(input.height, 'A altura', 180) } });
      if (boardNodeIds.length > 0) await tx.investigationBoardGroupItem.createMany({ data: boardNodeIds.map((boardNodeId) => ({ campaignId, groupId: created.id, boardNodeId })) });
      return tx.investigationBoardGroup.findUnique({ where: { id: created.id }, include: groupInclude });
    });
    return serializeGroup(requireGroup(group));
  },

  async updateGroup(id: string, input: { name?: string; color?: string; x?: number; y?: number; width?: number; height?: number; boardNodeIds?: string[] }) {
    const existing = requireGroup(await prisma.investigationBoardGroup.findUnique({ where: { id }, include: groupInclude }));
    await assertOwner(existing.campaignId);
    const boardNodeIds = input.boardNodeIds === undefined ? undefined : await assertNodes(existing.campaignId, input.boardNodeIds);
    const group = await prisma.$transaction(async (tx) => {
      await tx.investigationBoardGroup.update({ where: { id }, data: { ...(input.name === undefined ? {} : { name: text(input.name, 'O nome do grupo', MAX_GROUP_NAME) }), ...(input.color === undefined ? {} : { color: color(input.color) }), ...(input.x === undefined ? {} : { x: coordinate(input.x, 'A posição X') }), ...(input.y === undefined ? {} : { y: coordinate(input.y, 'A posição Y') }), ...(input.width === undefined ? {} : { width: size(input.width, 'A largura', 320) }), ...(input.height === undefined ? {} : { height: size(input.height, 'A altura', 180) }) } });
      if (boardNodeIds !== undefined) {
        await tx.investigationBoardGroupItem.deleteMany({ where: { groupId: id } });
        if (boardNodeIds.length > 0) await tx.investigationBoardGroupItem.createMany({ data: boardNodeIds.map((boardNodeId) => ({ campaignId: existing.campaignId, groupId: id, boardNodeId })) });
      }
      return tx.investigationBoardGroup.findUnique({ where: { id }, include: groupInclude });
    });
    return serializeGroup(requireGroup(group));
  },

  async removeGroup(id: string) {
    const existing = await prisma.investigationBoardGroup.findUnique({ where: { id }, select: { campaignId: true } });
    if (!existing) throw new BoardAnnotationIntegrityError('Agrupamento visual não encontrado.', 404);
    await assertOwner(existing.campaignId);
    await prisma.investigationBoardGroup.delete({ where: { id } });
  }
};
