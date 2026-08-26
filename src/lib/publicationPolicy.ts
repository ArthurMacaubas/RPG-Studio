import { Prisma, type CampaignMemberAudience } from '@prisma/client';
import { AccessDeniedError, getCampaignAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export type ViewerContext =
  | { kind: 'OWNER'; campaignId: string; userId: string }
  | { kind: 'PLAYER'; campaignId: string; userId: string; audience: CampaignMemberAudience | null }
  | { kind: 'PUBLIC'; campaignId: string };

export type PublicationState = 'PUBLIC' | 'GRANT' | 'PRIVATE' | 'ARCHIVED' | 'UNAVAILABLE';

const publishedFileSelect = {
  id: true,
  campaignId: true,
  type: true,
  name: true,
  description: true,
  content: true,
  data: true,
  isFavorite: true,
  isArchived: true,
  isTrashed: true,
  restrictToGrants: true,
  trashedAt: true,
  createdAt: true,
  updatedAt: true,
  tags: { select: { tag: { select: { id: true, campaignId: true, name: true, color: true, icon: true, description: true } } } },
  attachments: { select: { id: true, fileId: true, url: true, label: true, mimeType: true, createdAt: true } }
} satisfies Prisma.CampaignFileSelect;

export const publicationSelect = {
  file: publishedFileSelect,
  campaign: {
    id: true,
    name: true,
    description: true,
    system: true,
    coverImage: true,
    createdAt: true,
    updatedAt: true
  } satisfies Prisma.CampaignSelect
};

export function publicationStateOf(file: {
  isArchived: boolean;
  isTrashed: boolean;
  playerVisibility?: { isVisible: boolean } | null;
  restrictToGrants: boolean;
  hasGrant?: boolean;
}): PublicationState {
  if (file.isArchived) return 'ARCHIVED';
  if (file.isTrashed) return 'UNAVAILABLE';
  if (!file.playerVisibility?.isVisible) return 'PRIVATE';
  return file.restrictToGrants ? 'GRANT' : 'PUBLIC';
}

export function publishedFileWhere(viewer: ViewerContext): Prisma.CampaignFileWhereInput {
  if (viewer.kind === 'OWNER') return { campaignId: viewer.campaignId };
  return {
    campaignId: viewer.campaignId,
    isTrashed: false,
    isArchived: false,
    playerVisibility: { isVisible: true },
    ...(viewer.kind === 'PUBLIC'
      ? { restrictToGrants: false }
      : {
          OR: [
            { restrictToGrants: false },
            { restrictToGrants: true, grants: { some: { userId: viewer.userId, canView: true } } }
          ]
        })
  };
}

export function searchableFileWhere(userId: string): Prisma.CampaignFileWhereInput {
  return {
    OR: [
      { campaign: { ownerId: userId } },
      {
        campaign: {
          members: { some: { userId } },
          playerModeConfig: { is: { isEnabled: true } }
        },
        isTrashed: false,
        isArchived: false,
        playerVisibility: { isVisible: true },
        OR: [
          { restrictToGrants: false },
          { restrictToGrants: true, grants: { some: { userId, canView: true } } }
        ]
      }
    ]
  };
}

export async function getViewerContext(campaignId: string, options: { requirePlayerMode?: boolean } = {}): Promise<ViewerContext> {
  const access = await getCampaignAccess(campaignId);
  if (access.role === 'OWNER') return { kind: 'OWNER', campaignId, userId: access.user.id };

  const [member, config] = await Promise.all([
    prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId: access.user.id } },
      select: { audience: true }
    }),
    options.requirePlayerMode ? prisma.playerModeConfig.findUnique({ where: { campaignId }, select: { isEnabled: true } }) : null
  ]);

  if (!member) throw new AccessDeniedError('Acesso não autorizado.', 404);
  if (options.requirePlayerMode && !config?.isEnabled) throw new AccessDeniedError('Modo Jogador indisponível.', 404);
  return { kind: 'PLAYER', campaignId, userId: access.user.id, audience: member.audience };
}

export async function getPublicViewerContext(campaignId: string): Promise<Extract<ViewerContext, { kind: 'PUBLIC' }>> {
  const config = await prisma.playerModeConfig.findUnique({ where: { campaignId }, select: { isEnabled: true } });
  if (!config?.isEnabled) throw new AccessDeniedError('Modo Jogador indisponível.', 404);
  return { kind: 'PUBLIC', campaignId };
}

export async function assertViewerCanReadFile(
  fileId: string,
  options: { requirePlayerMode?: boolean } = {}
): Promise<{ viewer: ViewerContext; file: Prisma.CampaignFileGetPayload<{ select: typeof publishedFileSelect }> }> {
  const identity = await prisma.campaignFile.findUnique({ where: { id: fileId }, select: { campaignId: true } });
  if (!identity) throw new AccessDeniedError('Arquivo não encontrado.', 404);
  const viewer = await getViewerContext(identity.campaignId, options);
  const file = await prisma.campaignFile.findFirst({
    where: { id: fileId, ...publishedFileWhere(viewer) },
    select: publishedFileSelect
  });
  if (!file) throw new AccessDeniedError('Arquivo não encontrado.', 404);
  return { viewer, file };
}
