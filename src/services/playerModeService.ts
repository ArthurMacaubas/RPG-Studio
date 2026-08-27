import { prisma } from '@/lib/prisma';
import { assertCampaignAccess, assertFileAccess, getCampaignAccess } from '@/lib/access';
import { recordAudit } from '@/services/auditService';
import { relationshipService } from '@/services/relationshipService';
import { randomBytes } from 'crypto';
import { getPublicViewerContext, getViewerContext, publicationSelect, publicationStateOf, publishedFileWhere, type ViewerContext } from '@/lib/publicationPolicy';
import { campaignBriefingService } from '@/services/campaignBriefingService';

function playerRelationshipPayload(relationships: Array<{ id: string; fromId: string; toId: string; label: string | null; description: string | null; importance: 'CRITICAL' | 'IMPORTANT' | 'NORMAL' | 'OPTIONAL'; from: { name: string }; to: { name: string }; type: { key: string; name: string } }>) {
  return relationships.map((relationship) => ({ id: relationship.id, sourceId: relationship.fromId, targetId: relationship.toId, sourceName: relationship.from.name, targetName: relationship.to.name, type: { key: relationship.type.key, name: relationship.type.name }, label: relationship.label, description: relationship.description, importance: relationship.importance }));
}

export function playerVisibleWhere(campaignId: string, userId: string) {
  return publishedFileWhere({ kind: 'PLAYER', campaignId, userId, audience: null });
}

async function visibleFilesFor(viewer: ViewerContext) {
  return prisma.campaignFile.findMany({
    where: publishedFileWhere(viewer),
    select: publicationSelect.file,
    orderBy: { updatedAt: 'desc' }
  });
}

// Backs the GM-side "Modo Jogador" toggle screen and the read-only public
// view players open via the share link. Visibility is opt-in per file:
// anything without a PlayerVisibility row (or with isVisible: false) never
// reaches the player-facing route.
export const playerModeService = {
  async getOrCreateConfig(campaignId: string) {
    await assertCampaignAccess(campaignId);
    const existing = await prisma.playerModeConfig.findUnique({ where: { campaignId } });
    if (existing) return existing;
    return prisma.playerModeConfig.create({ data: { campaignId, isEnabled: false } });
  },

  async setEnabled(campaignId: string, isEnabled: boolean) {
    const access = await getCampaignAccess(campaignId, { write: true });
    const config = await this.getOrCreateConfig(campaignId);
    const shareSlug = config.shareSlug ?? (isEnabled ? randomBytes(6).toString('hex') : null);
    const updated = await prisma.playerModeConfig.update({ where: { campaignId }, data: { isEnabled, shareSlug } });
    void recordAudit({ campaignId, actorId: access.user.id, action: isEnabled ? 'PLAYER_MODE_ENABLED' : 'PLAYER_MODE_DISABLED', entityType: 'PlayerModeConfig', entityId: updated.id, metadata: { isEnabled } }).catch(() => undefined);
    return updated;
  },

  async setFileVisibility(fileId: string, isVisible: boolean) {
    const file = await assertFileAccess(fileId, { write: true });
    const access = await getCampaignAccess(file.campaignId, { write: true });
    const visibility = await prisma.playerVisibility.upsert({ where: { fileId }, update: { isVisible }, create: { fileId, isVisible } });
    void recordAudit({ campaignId: file.campaignId, actorId: access.user.id, action: isVisible ? 'FILE_PUBLISHED' : 'FILE_UNPUBLISHED', entityType: 'CampaignFile', entityId: fileId, metadata: { isVisible } }).catch(() => undefined);
    return visibility;
  },

  async listVisibility(campaignId: string) {
    await assertCampaignAccess(campaignId);
    const files = await prisma.campaignFile.findMany({
      where: { campaignId },
      select: { id: true, name: true, type: true, isArchived: true, isTrashed: true, restrictToGrants: true, playerVisibility: { select: { isVisible: true } } },
      orderBy: { name: 'asc' }
    });
    return files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      isVisible: f.playerVisibility?.isVisible ?? false,
      restrictToGrants: f.restrictToGrants,
      state: publicationStateOf(f)
    }));
  },

  async getAuthenticatedCampaign(campaignId: string) {
    const viewer = await getViewerContext(campaignId, { requirePlayerMode: true });
    const config = await prisma.playerModeConfig.findUnique({ where: { campaignId }, select: { campaign: { select: publicationSelect.campaign } } });
    // A Mestre opening /jogador is an OWNER PREVIEW of the public share view.
    // A real player keeps the grants and audience-specific PLAYER projection.
    const previewViewer = viewer.kind === 'OWNER' ? await getPublicViewerContext(campaignId) : viewer;
    const files = await visibleFilesFor(previewViewer);
    const [relationships, publicContent] = await Promise.all([
      previewViewer.kind === 'PUBLIC'
        ? relationshipService.listForPublic(campaignId, files.map((file) => file.id))
        : relationshipService.listForPlayer(campaignId, files.map((file) => file.id)),
      campaignBriefingService.getPublicSnapshot(previewViewer)
    ]);
    return { campaign: config?.campaign ?? null, files, relationships: playerRelationshipPayload(relationships), ...publicContent };
  },

  async previewForMember(campaignId: string, userId: string) {
    const access = await getCampaignAccess(campaignId, { write: true });
    const member = await prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    if (!member) throw Object.assign(new Error('Jogador não encontrado nesta campanha.'), { status: 404 });

    const config = await prisma.playerModeConfig.findUnique({ where: { campaignId }, select: { isEnabled: true } });
    const previewViewer: ViewerContext = { kind: 'PLAYER', campaignId, userId, audience: member.audience };
    const files = config?.isEnabled ? await visibleFilesFor(previewViewer) : [];

    const previewFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      tags: file.tags.map(({ tag }) => tag),
      access: file.restrictToGrants ? 'GRANT' as const : 'PUBLISHED' as const
    }));

    void recordAudit({
      campaignId,
      actorId: access.user.id,
      action: 'PLAYER_VIEW_PREVIEWED',
      entityType: 'CampaignMember',
      entityId: member.id,
      metadata: { targetUserId: userId, visibleFiles: previewFiles.length }
    }).catch(() => undefined);

    return {
      member: { id: member.id, userId: member.userId, name: member.user.name, email: member.user.email },
      modeEnabled: config?.isEnabled ?? false,
      files: previewFiles,
      publishedCount: previewFiles.filter((file) => file.access === 'PUBLISHED').length,
      grantCount: previewFiles.filter((file) => file.access === 'GRANT').length
    };
  },

  async getPublicCampaign(shareSlug: string) {
    const config = await prisma.playerModeConfig.findUnique({
      where: { shareSlug },
      select: { campaignId: true, isEnabled: true, campaign: { select: publicationSelect.campaign } }
    });
    if (!config || !config.isEnabled) return null;
    const viewer = await getPublicViewerContext(config.campaignId);
    const files = await visibleFilesFor(viewer);

    const [relationships, publicContent] = await Promise.all([
      relationshipService.listForPublic(config.campaignId, files.map((file) => file.id)),
      campaignBriefingService.getPublicSnapshot(viewer)
    ]);
    return { campaign: config.campaign, files, relationships: playerRelationshipPayload(relationships), ...publicContent };
  }
};
