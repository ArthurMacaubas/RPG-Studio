import { describe, expect, it } from 'vitest';
import type { CampaignExportDocument } from '@/types';
import { formatCampaignAsHtml } from './campaignTransferRender';

function documentFixture(): CampaignExportDocument {
  return {
    format: 'rpg-campaign-studio',
    version: 1,
    exportedAt: '2026-08-19T12:00:00.000Z',
    campaign: { id: 'campaign-1', name: 'Campanha <teste>', description: 'Descrição da mesa', system: 'CUSTOM', coverImage: null },
    customSystem: { attributes: [], skills: [], classes: [], races: [] },
    files: [{ id: 'file-1', type: 'CLUE', name: 'Pista <script>', description: null, content: 'Texto da pista', authorId: null, data: {}, isFavorite: false, isArchived: false, isTrashed: false, trashedAt: null, createdAt: '2026-08-19T12:00:00.000Z', updatedAt: '2026-08-19T12:00:00.000Z', tags: ['tag-1'], attachments: [{ url: 'data:image/png;base64,abc', label: 'Mapa', mimeType: 'image/png', createdAt: '2026-08-19T12:00:00.000Z' }], comments: [], history: [] }],
    tags: [{ id: 'tag-1', name: 'pista', color: '#c8a66a', icon: null, description: null }],
    relationships: [], favoriteFolders: [], sessions: [], timelineEvents: [], board: { nodes: [], edges: [] }, playerMode: { isEnabled: false, visibility: [] }
  };
}

describe('formatCampaignAsHtml', () => {
  it('renders an attractive printable document and escapes user content', () => {
    const html = formatCampaignAsHtml(documentFixture());
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('@media print');
    expect(html).toContain('Campanha &lt;teste&gt;');
    expect(html).toContain('Pista &lt;script&gt;');
    expect(html).toContain('data:image/png;base64,abc');
    expect(html).not.toContain('<script>');
  });
});
