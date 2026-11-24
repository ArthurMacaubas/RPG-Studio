import { afterEach, describe, expect, it, vi } from 'vitest';
import { invitesApi } from './api';

describe('invitesApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('desembrulha o convite retornado pelo endpoint de preview', async () => {
    const invite = {
      id: 'invite-1',
      inviteeEmail: 'player@example.com',
      expiresAt: '2026-12-01T00:00:00.000Z',
      campaign: { id: 'campaign-1', name: 'A campanha', description: null, coverImage: null, ownerId: 'owner-1' },
      inviter: { id: 'owner-1', name: 'Mestre', email: 'owner@example.com' }
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ invite }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(invitesApi.preview('token/with-slash')).resolves.toEqual(invite);
    expect(fetchMock).toHaveBeenCalledWith('/api/invites/token%2Fwith-slash', expect.any(Object));
  });
});
