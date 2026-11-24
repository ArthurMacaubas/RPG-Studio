import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, assertOwnedCampaignForWrite, getCampaignAccess, type CampaignAccess } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import type { Campaign, FavoriteFolderNavigation, SystemType } from '@/types';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  system: SystemType;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  coverImage?: string;
  isArchived?: boolean;
  system?: SystemType;
}

// All campaign persistence goes through this service — API routes and
// server components should never call `prisma` directly for campaigns.
// Keeping the boundary here is what lets us swap storage or add
// authorization checks in one place later.
export const campaignService = {
  async list(opts: { includeArchived?: boolean } = {}) {
    const user = await requireUser();
    return prisma.campaign.findMany({
      where: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        isArchived: opts.includeArchived ? undefined : false
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { files: true, sessions: true } }
      }
    });
  },

  async get(id: string) {
    await getCampaignAccess(id);
    return prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        system: true,
        coverImage: true,
        isArchived: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        attributes: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        classes: true,
        races: true
      }
    });
  },

  async getShell(id: string, access?: CampaignAccess): Promise<(Pick<Campaign, 'id' | 'name' | 'system' | 'isArchived' | 'ownerId'> & { favoriteFolders: FavoriteFolderNavigation[] }) | null> {
    const campaignAccess = access ?? await getCampaignAccess(id);
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        system: true,
        isArchived: true,
        ownerId: true,
        favoriteFolders: {
          where: campaignAccess.role === 'OWNER' ? undefined : { id: { in: [] } },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            campaignId: true,
            name: true,
            icon: true,
            color: true,
            order: true,
            isCollapsed: true,
            entries: {
              orderBy: { order: 'asc' },
              select: { id: true, folderId: true, fileId: true, order: true, file: { select: { id: true, name: true } } }
            }
          }
        }
      }
    });
    return campaign;
  },

  async create(input: CreateCampaignInput) {
    const user = await requireUser();
    return prisma.campaign.create({
      data: {
        name: input.name,
        description: input.description,
        system: input.system as any,
        ownerId: user.id,
        favoriteFolders: {
          create: [{ name: 'Sessão Atual', order: 0 }]
        },
        playerModeConfig: {
          create: { isEnabled: false }
        }
      }
    });
  },

  async update(id: string, input: UpdateCampaignInput) {
    await assertOwnedCampaignForWrite(id);
    return prisma.campaign.update({ where: { id }, data: { ...input, system: input.system as any } });
  },

  async archive(id: string) {
    await assertOwnedCampaignForWrite(id);
    return prisma.campaign.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
  },

  async restore(id: string) {
    await assertOwnedCampaignForWrite(id);
    return prisma.campaign.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
  },

  async remove(id: string) {
    await assertOwnedCampaignForWrite(id);
    return prisma.campaign.delete({ where: { id } });
  }
};
