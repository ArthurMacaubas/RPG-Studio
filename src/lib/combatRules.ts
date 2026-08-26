export type InitiativeParticipant = {
  id?: string;
  name: string;
  initiative: number;
  initiativeBonus: number;
  isDefeated?: boolean;
};

export type OrderedInitiativeParticipant = InitiativeParticipant & { turnOrder: number };

export function orderInitiative<T extends InitiativeParticipant>(participants: T[]): Array<T & { turnOrder: number }> {
  return [...participants]
    .sort((left, right) => {
      const initiative = right.initiative - left.initiative;
      if (initiative !== 0) return initiative;
      const bonus = right.initiativeBonus - left.initiativeBonus;
      if (bonus !== 0) return bonus;
      return left.name.localeCompare(right.name, 'pt-BR');
    })
    .map((participant, turnOrder) => ({ ...participant, turnOrder }));
}

export function nextCombatTurn(participants: OrderedInitiativeParticipant[], currentTurnOrder: number, round: number) {
  const active = [...participants].filter((participant) => !participant.isDefeated).sort((left, right) => left.turnOrder - right.turnOrder);
  if (active.length === 0) return { turnOrder: 0, round, hasActiveParticipant: false };

  const currentIndex = active.findIndex((participant) => participant.turnOrder === currentTurnOrder);
  if (currentIndex < 0) return { turnOrder: active[0]?.turnOrder ?? 0, round, hasActiveParticipant: true };
  const nextIndex = (currentIndex + 1) % active.length;
  return {
    turnOrder: active[nextIndex]?.turnOrder ?? 0,
    round: nextIndex === 0 ? round + 1 : round,
    hasActiveParticipant: true
  };
}

export function applyHitPointDelta(currentHp: number | null, maxHp: number | null, delta: number) {
  if (currentHp === null) return { currentHp: null, isDefeated: false };
  const ceiling = maxHp ?? Number.POSITIVE_INFINITY;
  const nextHp = Math.max(0, Math.min(ceiling, currentHp + delta));
  return { currentHp: nextHp, isDefeated: nextHp <= 0 };
}

export function canRevealOwnCombatStatus(input: { kind: 'CHARACTER' | 'THREAT'; sourceFileId: string | null; sourceAuthorId: string | null | undefined; userId: string; visibleSourceFileIds: Set<string> }) {
  return input.kind === 'CHARACTER'
    && input.sourceFileId !== null
    && input.sourceAuthorId === input.userId
    && input.visibleSourceFileIds.has(input.sourceFileId);
}
