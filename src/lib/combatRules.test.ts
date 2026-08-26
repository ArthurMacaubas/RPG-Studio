import { describe, expect, it } from 'vitest';
import { applyHitPointDelta, canRevealOwnCombatStatus, nextCombatTurn, orderInitiative } from './combatRules';

describe('combatRules', () => {
  it('ordena iniciativa por resultado, bônus e nome', () => {
    const ordered = orderInitiative([
      { id: 'threat', name: 'Aberração', initiative: 14, initiativeBonus: 2 },
      { id: 'ana', name: 'Ana', initiative: 16, initiativeBonus: 1 },
      { id: 'bia', name: 'Bia', initiative: 16, initiativeBonus: 3 }
    ]);

    expect(ordered.map(({ id, turnOrder }) => ({ id, turnOrder }))).toEqual([
      { id: 'bia', turnOrder: 0 },
      { id: 'ana', turnOrder: 1 },
      { id: 'threat', turnOrder: 2 }
    ]);
  });

  it('avança a rodada ao retornar para o primeiro participante ativo', () => {
    const participants = [
      { id: 'a', name: 'A', initiative: 20, initiativeBonus: 0, turnOrder: 0 },
      { id: 'b', name: 'B', initiative: 10, initiativeBonus: 0, turnOrder: 1 },
      { id: 'c', name: 'C', initiative: 5, initiativeBonus: 0, turnOrder: 2, isDefeated: true }
    ];

    expect(nextCombatTurn(participants, 0, 1)).toMatchObject({ turnOrder: 1, round: 1 });
    expect(nextCombatTurn(participants, 1, 1)).toMatchObject({ turnOrder: 0, round: 2 });
  });

  it('aplica dano e cura respeitando os limites de HP', () => {
    expect(applyHitPointDelta(8, 10, -12)).toEqual({ currentHp: 0, isDefeated: true });
    expect(applyHitPointDelta(8, 10, 9)).toEqual({ currentHp: 10, isDefeated: false });
  });

  it('expõe HP somente para a ficha visível e pertencente ao jogador atual', () => {
    const visibleSourceFileIds = new Set(['character-1']);
    expect(canRevealOwnCombatStatus({ kind: 'CHARACTER', sourceFileId: 'character-1', sourceAuthorId: 'player-1', userId: 'player-1', visibleSourceFileIds })).toBe(true);
    expect(canRevealOwnCombatStatus({ kind: 'CHARACTER', sourceFileId: 'character-1', sourceAuthorId: 'gm-1', userId: 'player-1', visibleSourceFileIds })).toBe(false);
    expect(canRevealOwnCombatStatus({ kind: 'THREAT', sourceFileId: 'character-1', sourceAuthorId: 'player-1', userId: 'player-1', visibleSourceFileIds })).toBe(false);
    expect(canRevealOwnCombatStatus({ kind: 'CHARACTER', sourceFileId: 'character-2', sourceAuthorId: 'player-1', userId: 'player-1', visibleSourceFileIds })).toBe(false);
  });
});
