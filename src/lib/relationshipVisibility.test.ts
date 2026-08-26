import { describe, expect, it } from 'vitest';
import { canViewRelationshipVisibility, visibleRelationshipAudiences } from './relationshipVisibility';

describe('relationship visibility audiences', () => {
  it('permite que o Mestre veja todos os níveis de visibilidade', () => {
    const viewer = { role: 'OWNER' as const, userId: 'gm-1', audience: null };
    expect(visibleRelationshipAudiences(viewer)).toBeNull();
    for (const visibility of ['GM', 'ALL', 'P1', 'P2', 'P3', 'P4'] as const) expect(canViewRelationshipVisibility(viewer, visibility)).toBe(true);
  });

  for (const audience of ['P1', 'P2', 'P3', 'P4'] as const) {
    it(`permite que ${audience} veja somente ALL e ${audience}`, () => {
      const viewer = { role: 'PLAYER' as const, userId: `player-${audience}`, audience };
      expect(visibleRelationshipAudiences(viewer)).toEqual(['ALL', audience]);
      expect(canViewRelationshipVisibility(viewer, 'ALL')).toBe(true);
      expect(canViewRelationshipVisibility(viewer, audience)).toBe(true);
      for (const restricted of ['GM', ...(['P1', 'P2', 'P3', 'P4'] as const).filter((value) => value !== audience)] as const) expect(canViewRelationshipVisibility(viewer, restricted)).toBe(false);
    });
  }

  it('mantém jogador sem audiência restrito ao nível ALL', () => {
    const viewer = { role: 'PLAYER' as const, userId: 'player-sem-slot', audience: null };
    expect(visibleRelationshipAudiences(viewer)).toEqual(['ALL']);
    expect(canViewRelationshipVisibility(viewer, 'ALL')).toBe(true);
    expect(canViewRelationshipVisibility(viewer, 'GM')).toBe(false);
  });
});
