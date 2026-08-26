import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const editor = readFileSync(new URL('./InvestigationBoardEditor.tsx', import.meta.url), 'utf8');
const annotationsPanel = readFileSync(new URL('./BoardAnnotationsPanel.tsx', import.meta.url), 'utf8');
const playerBoard = readFileSync(new URL('../../../../components/PlayerInvestigationBoard.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../../../../lib/api.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../../../../services/boardAnnotationService.ts', import.meta.url), 'utf8');
const transfer = readFileSync(new URL('../../../../services/campaignTransferService.ts', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../../../../../prisma/schema.prisma', import.meta.url), 'utf8');

 describe('Q04 — pins, notas e agrupamentos visuais', () => {
  it('integra carregamento, camada local e CRUD administrativo no editor', () => {
    expect(editor).toContain('boardAnnotationsApi.list(campaignId)');
    expect(editor).toContain('filters.layers.annotations');
    expect(editor).toContain('<BoardAnnotationsPanel');
    expect(editor).toContain('onCreatePin={createPin}');
    expect(editor).toContain('onCreateGroup={createGroup}');
  });

  it('mantém o painel de anotações separado das fontes canônicas', () => {
    expect(annotationsPanel).toContain('não são fichas, relações oficiais, fios ou evidências');
    expect(annotationsPanel).toContain('onUpdateGroup');
    expect(annotationsPanel).toContain('onRemovePin');
    expect(service).toContain("assertCampaignRole(campaignId, 'OWNER')");
    expect(service).toContain('assertNodes');
    expect(service).not.toContain('relationship');
  });

  it('não expõe anotações ao componente do jogador', () => {
    expect(playerBoard).not.toContain('BoardAnnotationsPanel');
    expect(playerBoard).not.toContain('boardAnnotationsApi');
    expect(editor).toContain('Anotações');
  });

  it('mantém exportação/importação administrativa com remapeamento por fileId', () => {
    expect(api).toContain('boardAnnotationsApi');
    expect(transfer).toContain('campaign.investigationBoardPins');
    expect(transfer).toContain('campaign.investigationBoardGroups');
    expect(transfer).toContain('document.board.pins');
    expect(transfer).toContain('document.board.groups');
    expect(transfer).toContain('nodeIds.get(fileId)');
  });

  it('registra as entidades próprias e relações campanha-scoped no schema', () => {
    expect(schema).toContain('model InvestigationBoardPin');
    expect(schema).toContain('model InvestigationBoardGroup');
    expect(schema).toContain('model InvestigationBoardGroupItem');
    expect(schema).toContain('references: [campaignId, id]');
  });
});
