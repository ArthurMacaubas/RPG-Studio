import { CombatEncounterStatus, CombatParticipantKind, Prisma } from '@prisma/client';
import { assertCampaignRole, getCampaignAccess } from '@/lib/access';
import { applyHitPointDelta, canRevealOwnCombatStatus, nextCombatTurn, orderInitiative } from '@/lib/combatRules';
import { prisma } from '@/lib/prisma';
import { playerVisibleWhere } from '@/services/playerModeService';
import { recordAudit } from '@/services/auditService';
import { logHistory } from '@/services/historyService';

type CombatParticipantInput = {
  sourceFileId?: string;
  name: string;
  kind: CombatParticipantKind;
  initiative: number;
  initiativeBonus?: number;
  currentHp?: number | null;
  maxHp?: number | null;
  conditions?: string[];
  isVisibleToPlayers?: boolean;
};

type EncounterInput = {
  name: string;
  sessionId?: string;
  participants: CombatParticipantInput[];
};

const encounterInclude = {
  session: { select: { id: true, name: true } },
  participants: {
    orderBy: { turnOrder: 'asc' },
    include: { sourceFile: { select: { id: true, name: true, type: true, authorId: true } } }
  }
} satisfies Prisma.CombatEncounterInclude;

function combatError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function normalizedConditions(value: string[] | undefined) {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))].slice(0, 12);
}

async function findEncounter(campaignId: string, encounterId: string) {
  const encounter = await prisma.combatEncounter.findFirst({ where: { id: encounterId, campaignId }, include: encounterInclude });
  if (!encounter) throw combatError('Encontro não encontrado nesta campanha.', 404);
  return encounter;
}

export const combatService = {
  async listForCampaign(campaignId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    return prisma.combatEncounter.findMany({
      where: { campaignId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: encounterInclude
    });
  },

  async get(campaignId: string, encounterId: string) {
    await assertCampaignRole(campaignId, 'OWNER');
    return findEncounter(campaignId, encounterId);
  },

  async create(campaignId: string, input: EncounterInput) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const name = input.name.trim();
    if (!name) throw combatError('Informe o nome do encontro.', 422);
    if (input.participants.length === 0) throw combatError('Adicione ao menos um participante.', 422);

    if (input.sessionId) {
      const session = await prisma.session.findFirst({ where: { id: input.sessionId, campaignId }, select: { id: true } });
      if (!session) throw combatError('A sessão informada não pertence a esta campanha.', 422);
    }

    const sourceIds = input.participants.flatMap((participant) => participant.sourceFileId ? [participant.sourceFileId] : []);
    const sourceFiles = sourceIds.length
      ? await prisma.campaignFile.findMany({ where: { id: { in: sourceIds }, campaignId, isTrashed: false }, select: { id: true, type: true, name: true } })
      : [];
    const sourceById = new Map(sourceFiles.map((file) => [file.id, file]));

    const ordered = orderInitiative(input.participants.map((participant) => {
      const source = participant.sourceFileId ? sourceById.get(participant.sourceFileId) : undefined;
      if (participant.sourceFileId && !source) throw combatError('Um participante não pertence à campanha ou está indisponível.', 422);
      if (source && ((participant.kind === 'THREAT' && source.type !== 'THREAT') || (participant.kind === 'CHARACTER' && source.type !== 'CHARACTER'))) {
        throw combatError('O tipo do participante não corresponde ao arquivo selecionado.', 422);
      }
      const participantName = participant.name.trim() || source?.name;
      if (!participantName) throw combatError('Todo participante precisa de um nome.', 422);
      const maxHp = participant.maxHp ?? null;
      const currentHp = participant.currentHp ?? maxHp;
      if (maxHp !== null && maxHp < 0) throw combatError('HP máximo não pode ser negativo.', 422);
      if (currentHp !== null && currentHp < 0) throw combatError('HP atual não pode ser negativo.', 422);
      return {
        ...participant,
        name: participantName,
        initiative: Math.trunc(participant.initiative),
        initiativeBonus: Math.trunc(participant.initiativeBonus ?? 0),
        currentHp,
        maxHp,
        conditions: normalizedConditions(participant.conditions)
      };
    }));

    const encounter = await prisma.combatEncounter.create({
      data: {
        campaignId,
        sessionId: input.sessionId || null,
        name,
        participants: {
          create: ordered.map((participant) => ({
            sourceFileId: participant.sourceFileId || null,
            name: participant.name,
            kind: participant.kind,
            initiative: participant.initiative,
            initiativeBonus: participant.initiativeBonus,
            turnOrder: participant.turnOrder,
            currentHp: participant.currentHp,
            maxHp: participant.maxHp,
            conditions: participant.conditions,
            isDefeated: participant.currentHp === 0,
            isVisibleToPlayers: participant.isVisibleToPlayers ?? true
          }))
        }
      },
      include: encounterInclude
    });
    void recordAudit({ campaignId, actorId: access.user.id, action: 'COMBAT_ENCOUNTER_CREATED', entityType: 'CombatEncounter', entityId: encounter.id, metadata: { participants: encounter.participants.length, sessionId: encounter.sessionId } }).catch(() => undefined);
    return encounter;
  },

  async start(campaignId: string, encounterId: string) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const encounter = await findEncounter(campaignId, encounterId);
    if (encounter.status === 'ENDED') throw combatError('Um encontro encerrado não pode ser reiniciado.', 409);
    if (encounter.participants.length === 0) throw combatError('O encontro não possui participantes.', 422);
    const updated = await prisma.combatEncounter.update({
      where: { id: encounterId },
      data: { status: CombatEncounterStatus.IN_PROGRESS, round: Math.max(1, encounter.round), turnIndex: encounter.participants[0]?.turnOrder ?? 0, startedAt: encounter.startedAt ?? new Date(), endedAt: null },
      include: encounterInclude
    });
    void recordAudit({ campaignId, actorId: access.user.id, action: 'COMBAT_STARTED', entityType: 'CombatEncounter', entityId: encounterId }).catch(() => undefined);
    return updated;
  },

  async advance(campaignId: string, encounterId: string) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const encounter = await findEncounter(campaignId, encounterId);
    if (encounter.status !== 'IN_PROGRESS') throw combatError('Inicie o encontro antes de avançar o turno.', 409);
    const next = nextCombatTurn(encounter.participants, encounter.turnIndex, encounter.round);
    if (!next.hasActiveParticipant) throw combatError('Não há participantes ativos para avançar o turno.', 422);
    const updated = await prisma.combatEncounter.update({ where: { id: encounterId }, data: { turnIndex: next.turnOrder, round: next.round }, include: encounterInclude });
    void recordAudit({ campaignId, actorId: access.user.id, action: 'COMBAT_TURN_ADVANCED', entityType: 'CombatEncounter', entityId: encounterId, metadata: { round: next.round, turnOrder: next.turnOrder } }).catch(() => undefined);
    return updated;
  },

  async end(campaignId: string, encounterId: string) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    await findEncounter(campaignId, encounterId);
    const updated = await prisma.combatEncounter.update({ where: { id: encounterId }, data: { status: CombatEncounterStatus.ENDED, endedAt: new Date() }, include: encounterInclude });
    void recordAudit({ campaignId, actorId: access.user.id, action: 'COMBAT_ENDED', entityType: 'CombatEncounter', entityId: encounterId, metadata: { round: updated.round } }).catch(() => undefined);
    return updated;
  },

  async updateParticipant(campaignId: string, encounterId: string, participantId: string, input: { hitPointDelta?: number; conditions?: string[]; isVisibleToPlayers?: boolean }) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const participant = await prisma.combatParticipant.findFirst({ where: { id: participantId, encounterId, encounter: { campaignId } }, include: { sourceFile: { select: { id: true } } } });
    if (!participant) throw combatError('Participante não encontrado neste encontro.', 404);

    const hitPoints = input.hitPointDelta === undefined ? undefined : applyHitPointDelta(participant.currentHp, participant.maxHp, Math.trunc(input.hitPointDelta));
    const updated = await prisma.combatParticipant.update({
      where: { id: participantId },
      data: {
        currentHp: hitPoints?.currentHp,
        isDefeated: hitPoints?.isDefeated,
        conditions: input.conditions === undefined ? undefined : normalizedConditions(input.conditions),
        isVisibleToPlayers: input.isVisibleToPlayers
      }
    });
    if (participant.sourceFileId && input.hitPointDelta !== undefined) void logHistory(participant.sourceFileId, 'combat_hp_changed', `HP alterado em ${input.hitPointDelta > 0 ? '+' : ''}${input.hitPointDelta}`, access.user.id).catch(() => undefined);
    void recordAudit({ campaignId, actorId: access.user.id, action: input.hitPointDelta === undefined ? 'COMBAT_PARTICIPANT_UPDATED' : 'COMBAT_HP_CHANGED', entityType: 'CombatParticipant', entityId: participantId, metadata: { encounterId, hitPointDelta: input.hitPointDelta ?? null, isDefeated: updated.isDefeated } }).catch(() => undefined);
    return updated;
  },

  async getPlayerView(campaignId: string) {
    const access = await getCampaignAccess(campaignId);
    if (access.role === 'OWNER') return null;
    const config = await prisma.playerModeConfig.findUnique({ where: { campaignId }, select: { isEnabled: true } });
    if (!config?.isEnabled) return null;
    const encounter = await prisma.combatEncounter.findFirst({ where: { campaignId, status: 'IN_PROGRESS' }, orderBy: { updatedAt: 'desc' }, include: encounterInclude });
    if (!encounter) return null;

    const sourceIds = encounter.participants.flatMap((participant) => participant.sourceFileId ? [participant.sourceFileId] : []);
    const visibleFiles = sourceIds.length ? await prisma.campaignFile.findMany({ where: { id: { in: sourceIds }, ...playerVisibleWhere(campaignId, access.user.id) }, select: { id: true } }) : [];
    const visibleSourceIds = new Set(visibleFiles.map((file) => file.id));

    return {
      id: encounter.id,
      name: encounter.name,
      round: encounter.round,
      participants: encounter.participants.filter((participant) => participant.isVisibleToPlayers).map((participant) => {
        const isOwnCharacter = canRevealOwnCombatStatus({ kind: participant.kind, sourceFileId: participant.sourceFileId, sourceAuthorId: participant.sourceFile?.authorId, userId: access.user.id, visibleSourceFileIds: visibleSourceIds });
        return {
          id: participant.id,
          name: participant.name,
          kind: participant.kind,
          initiative: participant.initiative,
          turnOrder: participant.turnOrder,
          isCurrentTurn: participant.turnOrder === encounter.turnIndex,
          ownHp: isOwnCharacter ? { currentHp: participant.currentHp, maxHp: participant.maxHp } : null,
          conditions: isOwnCharacter ? participant.conditions : []
        };
      })
    };
  }
};
