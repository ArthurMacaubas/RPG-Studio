import type { PlayerAudience, RelationshipVisibility } from '@/types';

export type RelationshipViewer = {
  role: 'OWNER' | 'PLAYER';
  userId: string;
  audience: PlayerAudience | null;
};

export function visibleRelationshipAudiences(viewer: RelationshipViewer): RelationshipVisibility[] | null {
  if (viewer.role === 'OWNER') return null;
  return viewer.audience ? ['ALL', viewer.audience] : ['ALL'];
}

export function canViewRelationshipVisibility(viewer: RelationshipViewer, visibility: RelationshipVisibility) {
  const allowed = visibleRelationshipAudiences(viewer);
  return allowed === null || allowed.includes(visibility);
}
