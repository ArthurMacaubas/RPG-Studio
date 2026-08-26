import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertCampaignRole } from '@/lib/access';

export type AuditInput = {
  campaignId?: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export function recordAudit(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      campaignId: input.campaignId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
    }
  });
}

export const auditService = {
  async listForCampaign(campaignId: string, take = 80) {
    await assertCampaignRole(campaignId, 'OWNER');
    return prisma.auditEvent.findMany({
      where: { campaignId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 200)
    });
  }
};
