import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/access', () => ({ AccessDeniedError: class AccessDeniedError extends Error {}, getCampaignAccess: vi.fn() }));

import { publicationStateOf, publishedFileWhere } from './publicationPolicy';

describe('publishedFileWhere', () => {
  it('mantém o Mestre fora do filtro de publicação', () => {
    expect(publishedFileWhere({ kind: 'OWNER', campaignId: 'campaign-1', userId: 'gm-1' })).toEqual({ campaignId: 'campaign-1' });
  });

  it.each(['P1', 'P2', 'P3', 'P4'] as const)('exige publicação, atividade e grant correto para o jogador %s', (audience) => {
    expect(publishedFileWhere({ kind: 'PLAYER', campaignId: 'campaign-1', userId: 'player-1', audience })).toEqual({
      campaignId: 'campaign-1',
      isTrashed: false,
      isArchived: false,
      playerVisibility: { isVisible: true },
      OR: [
        { restrictToGrants: false },
        { restrictToGrants: true, grants: { some: { userId: 'player-1', canView: true } } }
      ]
    });
  });

  it('restringe link público a arquivo publicado, ativo e sem grant', () => {
    expect(publishedFileWhere({ kind: 'PUBLIC', campaignId: 'campaign-1' })).toEqual({
      campaignId: 'campaign-1',
      isTrashed: false,
      isArchived: false,
      playerVisibility: { isVisible: true },
      restrictToGrants: false
    });
  });
});

describe('publicationStateOf', () => {
  it.each([
    [{ isArchived: false, isTrashed: false, playerVisibility: { isVisible: true }, restrictToGrants: false }, 'PUBLIC'],
    [{ isArchived: false, isTrashed: false, playerVisibility: { isVisible: true }, restrictToGrants: true }, 'GRANT'],
    [{ isArchived: false, isTrashed: false, playerVisibility: { isVisible: false }, restrictToGrants: false }, 'PRIVATE'],
    [{ isArchived: true, isTrashed: false, playerVisibility: { isVisible: true }, restrictToGrants: false }, 'ARCHIVED'],
    [{ isArchived: false, isTrashed: true, playerVisibility: { isVisible: true }, restrictToGrants: false }, 'UNAVAILABLE']
  ] as const)('classifica o arquivo como %s', (file, expected) => {
    expect(publicationStateOf(file)).toBe(expected);
  });
});
