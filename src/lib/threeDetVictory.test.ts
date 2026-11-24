import { describe, expect, it } from 'vitest';
import { calculateThreeDetBuild, calculateThreeDetDamage, calculateThreeDetDiceCount, calculateThreeDetResources, rollThreeDetTest, resolveThreeDetOpposed } from './threeDetVictory';

describe('3DeT Victory rules', () => {
  it('calculates derived resources with minimum one', () => {
    expect(calculateThreeDetResources({ poder: 0, habilidade: 3, resistencia: 2 })).toEqual({ pa: { current: 1, max: 1 }, pm: { current: 15, max: 15 }, pv: { current: 10, max: 10 } });
  });

  it('keeps current resources editable while recalculating maximums', () => {
    expect(calculateThreeDetResources({ poder: 2, habilidade: 3, resistencia: 2 }, {}, { pa: 1, pm: 4, pv: 99 })).toEqual({ pa: { current: 1, max: 2 }, pm: { current: 4, max: 15 }, pv: { current: 10, max: 10 } });
  });

  it('limits gains and losses to one net die and never leaves zero dice', () => {
    expect(calculateThreeDetDiceCount({ hasSkill: true, gains: 4, losses: 1 })).toBe(3);
    expect(calculateThreeDetDiceCount({ hasSkill: true, gains: 1, losses: 4 })).toBe(1);
    expect(calculateThreeDetDiceCount({ gains: 0, losses: 3 })).toBe(1);
  });

  it('adds the attribute again for each six and flags all ones', () => {
    const critical = rollThreeDetTest({ attribute: 3, hasSkill: true, random: (() => { const values = [0.5, 0.9]; return () => values.shift() ?? 0; })() });
    expect(critical.total).toBe(16);
    expect(critical.criticalCount).toBe(1);
    const failure = rollThreeDetTest({ attribute: 2, hasSkill: true, random: () => 0 });
    expect(failure.criticalFailure).toBe(true);
  });

  it('resolves target, opposed tests and damage', () => {
    const left = rollThreeDetTest({ attribute: 3, target: 8, random: () => 0.9 });
    const right = rollThreeDetTest({ attribute: 1, random: () => 0 });
    expect(left.success).toBe(true);
    expect(resolveThreeDetOpposed(left, right)).toBe('LEFT');
    expect(calculateThreeDetDamage(8, 3)).toBe(5);
    expect(calculateThreeDetDamage(8, 16)).toBe(0);
  });

  it('applies the configured budget and disadvantage cap', () => {
    expect(calculateThreeDetBuild({ attributes: { poder: 2, habilidade: 3, resistencia: 2 }, skills: { luta: true }, advantages: [{ cost: 2 }], disadvantages: [{ value: 3 }] })).toMatchObject({ spent: 10, returnedByDisadvantages: 2, remaining: 2, valid: true });
  });
});
