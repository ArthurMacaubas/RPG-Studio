import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, assertOwnedCampaignForWrite, getCampaignAccess } from '@/lib/access';
import { requireUser } from '@/lib/auth';
import type { SystemType } from '@/types';

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
    const access = await getCampaignAccess(id);
    if (access.role === 'PLAYER') {
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
          races: true,
          favoriteFolders: {
            where: { id: { in: [] } },
            orderBy: { order: 'asc' },
            include: { entries: { include: { file: true }, orderBy: { order: 'asc' } } }
          }
        }
      });
    }
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: { select: { files: true, sessions: true } },
        attributes: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        classes: true,
        races: true,
        favoriteFolders: {
          orderBy: { order: 'asc' },
          include: { entries: { include: { file: true }, orderBy: { order: 'asc' } } }
        }
      }
    });
  },

  async create(input: CreateCampaignInput) {
    const user = await requireUser();
    return prisma.campaign.create({
      data: {
        name: input.name,
        description: input.description,
        system: input.system,
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
    return prisma.campaign.update({ where: { id }, data: input });
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
