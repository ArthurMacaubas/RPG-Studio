import { Prisma } from '@prisma/client';
import { getCampaignAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/services/auditService';
import type { SheetData } from '@/types';
import { logHistory } from '@/services/historyService';

export class PlayerCharacterError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'PlayerCharacterError';
    this.status = status;
  }
}

const characterInclude = {
  tags: { include: { tag: true } },
  attachments: true
} as const;

function initialSheet(playerName: string): SheetData {
  return {
    playerName,
    level: 1,
    concept: '',
    pronouns: '',
    attributes: {},
    skills: {},
    abilities: [],
    inventory: [],
    notes: ''
  };
}

export const playerCharacterService = {
  async getMine(campaignId: string) {
    const access = await getCampaignAccess(campaignId);
    if (access.role !== 'PLAYER') throw new PlayerCharacterError('A criação de personagem é exclusiva para jogadores.', 403);
    return prisma.campaignFile.findFirst({
      where: { campaignId, type: 'CHARACTER', authorId: access.user.id, isTrashed: false },
      include: characterInclude,
      orderBy: { createdAt: 'asc' }
    });
  },

  async updateMine(fileId: string, data: SheetData) {
    const existing = await prisma.campaignFile.findUnique({ where: { id: fileId }, select: { id: true, campaignId: true, type: true, authorId: true } });
    if (!existing || existing.type !== 'CHARACTER') throw new PlayerCharacterError('Ficha não encontrada.', 404);
    const access = await getCampaignAccess(existing.campaignId);
    if (access.role !== 'PLAYER' || existing.authorId !== access.user.id) throw new PlayerCharacterError('Você só pode editar a própria ficha.', 403);
    const file = await prisma.campaignFile.update({ where: { id: fileId }, data: { data: data as Prisma.InputJsonValue }, include: characterInclude });
    await logHistory(fileId, 'edited', 'Ficha atualizada pelo jogador', access.user.id);
    void recordAudit({ campaignId: existing.campaignId, actorId: access.user.id, action: 'PLAYER_CHARACTER_UPDATED', entityType: 'CampaignFile', entityId: fileId }).catch(() => undefined);
    return file;
  },

  async create(campaignId: string, name: string) {
    const access = await getCampaignAccess(campaignId);
    if (access.role !== 'PLAYER') throw new PlayerCharacterError('A criação de personagem é exclusiva para jogadores.', 403);
    const normalizedName = name.trim();
    if (!normalizedName) throw new PlayerCharacterError('Informe um nome para o personagem.', 422);

    const existing = await prisma.campaignFile.findFirst({ where: { campaignId, type: 'CHARACTER', authorId: access.user.id, isTrashed: false }, select: { id: true } });
    if (existing) throw new PlayerCharacterError('Você já possui uma ficha nesta campanha.', 409);

    const file = await prisma.campaignFile.create({
      data: {
        campaignId,
        type: 'CHARACTER',
        name: normalizedName,
        description: 'Ficha criada pelo jogador.',
        data: initialSheet(access.user.name) as Prisma.InputJsonValue,
        authorId: access.user.id,
        restrictToGrants: true,
        playerVisibility: { create: { isVisible: true } },
        grants: { create: { userId: access.user.id, canView: true } }
      },
      include: characterInclude
    });

    void recordAudit({ campaignId, actorId: access.user.id, action: 'PLAYER_CHARACTER_CREATED', entityType: 'CampaignFile', entityId: file.id, metadata: { name: normalizedName } }).catch(() => undefined);
    return file;
  }
};
