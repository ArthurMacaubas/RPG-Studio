import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, getCampaignAccess } from '@/lib/access';
import { getViewerContext, publishedFileWhere, publicationSelect } from '@/lib/publicationPolicy';

export class BoardIntegrityError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'BoardIntegrityError';
    this.status = status;
  }
}

async function getNode(id: string) {
  const node = await prisma.boardNode.findUnique({ where: { id }, include: { file: true } });
  if (!node) throw new BoardIntegrityError('Nó do quadro não encontrado.', 404);
  return node;
}

async function assertFileBelongsToCampaign(campaignId: string, fileId: string) {
  await assertCampaignAccess(campaignId);
  const file = await prisma.campaignFile.findFirst({ where: { id: fileId, campaignId, isTrashed: false } });
  if (!file) throw new BoardIntegrityError('O arquivo não pertence à campanha ou não está disponível.', 404);
  return file;
}

export const boardService = {
  async get(campaignId: string) {
    const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
    const nodes = await prisma.boardNode.findMany({
      where: { campaignId, file: publishedFileWhere(viewer) },
      select: { id: true, campaignId: true, fileId: true, x: true, y: true, file: { select: publicationSelect.file } },
      orderBy: { id: 'asc' }
    });
    const nodeIds = nodes.map((node) => node.id);
    const edges = nodeIds.length === 0 ? [] : await prisma.boardEdge.findMany({ where: { campaignId, fromNodeId: { in: nodeIds }, toNodeId: { in: nodeIds } }, orderBy: { id: 'asc' } });
    return { nodes, edges };
  },

  async upsertNode(campaignId: string, fileId: string, x: number, y: number) {
    await assertCampaignAccess(campaignId, { write: true });
    await assertFileBelongsToCampaign(campaignId, fileId);
    return prisma.boardNode.upsert({
      where: { fileId },
      update: { x, y },
      create: { campaignId, fileId, x, y },
      include: { file: true }
    });
  },

  async moveNode(fileId: string, x: number, y: number) {
    const node = await prisma.boardNode.findUnique({ where: { fileId }, include: { campaign: true } });
    if (node) await assertCampaignAccess(node.campaignId, { write: true });
    if (!node) throw new BoardIntegrityError('Nó do quadro não encontrado.', 404);
    return prisma.boardNode.update({ where: { id: node.id }, data: { x, y } });
  },

  async updatePositions(campaignId: string, positions: Array<{ fileId: string; x: number; y: number }>) {
    await assertCampaignAccess(campaignId, { write: true });
    if (positions.length === 0) throw new BoardIntegrityError('Informe ao menos uma posição para atualizar.');
    if (positions.length > 120) throw new BoardIntegrityError('O layout é limitado a 120 nós.');
    if (new Set(positions.map((position) => position.fileId)).size !== positions.length) throw new BoardIntegrityError('O layout contém nós duplicados.');
    if (positions.some((position) => !Number.isFinite(position.x) || !Number.isFinite(position.y) || position.x < -100000 || position.x > 100000 || position.y < -100000 || position.y > 100000)) {
      throw new BoardIntegrityError('As posições precisam ser números finitos dentro do limite permitido.');
    }
    const nodes = await prisma.boardNode.findMany({ where: { campaignId, fileId: { in: positions.map((position) => position.fileId) } }, select: { fileId: true } });
    if (nodes.length !== positions.length) throw new BoardIntegrityError('Todas as posições precisam pertencer ao quadro da campanha.');
    const updates = positions.map((position) => prisma.boardNode.update({ where: { fileId: position.fileId }, data: { x: position.x, y: position.y }, select: { id: true, fileId: true, x: true, y: true } }));
    return { positions: await prisma.$transaction(updates) };
  },

  async removeNode(id: string) {
    const node = await getNode(id);
    await assertCampaignAccess(node.campaignId, { write: true });
    await prisma.boardNode.delete({ where: { id } });
  },

  async createEdge(input: { campaignId: string; fromNodeId: string; toNodeId: string; label?: string; color?: string; description?: string; curve?: number }) {
    if (input.fromNodeId === input.toNodeId) throw new BoardIntegrityError('Um nó não pode se conectar a ele mesmo.');
    await assertCampaignAccess(input.campaignId, { write: true });
    const [fromNode, toNode] = await Promise.all([getNode(input.fromNodeId), getNode(input.toNodeId)]);
    if (fromNode.campaignId !== input.campaignId || toNode.campaignId !== input.campaignId) {
      throw new BoardIntegrityError('Os nós precisam pertencer à campanha informada.');
    }
    const duplicate = await prisma.boardEdge.findFirst({ where: { campaignId: input.campaignId, fromNodeId: input.fromNodeId, toNodeId: input.toNodeId } });
    if (duplicate) throw new BoardIntegrityError('Essa conexão visual já existe.');
    return prisma.boardEdge.create({
      data: {
        campaignId: input.campaignId,
        fromNodeId: input.fromNodeId,
        toNodeId: input.toNodeId,
        label: input.label?.trim() || undefined,
        color: input.color,
        description: input.description?.trim() || undefined,
        curve: Math.max(-180, Math.min(180, input.curve ?? 0))
      }
    });
  },

  async updateEdge(id: string, input: Partial<{ label: string | null; color: string; description: string | null; curve: number }>) {
    const edge = await getEdge(id);
    await assertCampaignAccess(edge.campaignId, { write: true });
    return prisma.boardEdge.update({ where: { id }, data: { ...input, curve: input.curve === undefined ? undefined : Math.max(-180, Math.min(180, input.curve)) } });
  },

  async removeEdge(id: string) {
    const edge = await getEdge(id);
    await assertCampaignAccess(edge.campaignId, { write: true });
    await prisma.boardEdge.delete({ where: { id } });
  }
};

async function getEdge(id: string) {
  const edge = await prisma.boardEdge.findUnique({ where: { id } });
  if (!edge) throw new BoardIntegrityError('Conexão visual não encontrada.', 404);
  return edge;
}
